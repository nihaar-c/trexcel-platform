import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock primitives — available inside vi.mock factories.
// ---------------------------------------------------------------------------
const mockGetUser = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

const { saveWaiver, upsertSubmission } = await import(
  "@/app/dashboard/actions"
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a fluent Supabase query-builder mock that:
 * - passes `result` to .single() and .upsert()
 * - resolves with `result` when awaited directly (covers .update().eq())
 */
function makeBuilder(result: { data: unknown; error: unknown }) {
  type Builder = {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    then: (res: (v: unknown) => void, rej?: (e: unknown) => void) => Promise<unknown>;
  };

  const b: Builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    upsert: vi.fn().mockResolvedValue(result),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    // Makes `await builder` (without .single()) resolve correctly.
    then: (res, rej) => Promise.resolve(result).then(res, rej),
  };

  // Ensure chained methods also return the builder.
  (["select", "eq", "insert", "update"] as const).forEach((m) => {
    b[m].mockReturnValue(b);
  });

  return b;
}

function fd(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return form;
}

// ---------------------------------------------------------------------------
// saveWaiver
// ---------------------------------------------------------------------------

const FULL_WAIVER = {
  student_full_name: "Jane Doe",
  parent_name: "John Doe",
  parent_phone: "555-0100",
  parent_email: "john@example.com",
  parent_signature: "John Doe",
  student_signature: "Jane Doe",
  signed_date: "2026-10-10",
  agreed: "on",
  media_consent: "on",
  file_url: "",
};

describe("saveWaiver", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockFrom.mockReset();
  });

  it("returns an error when the user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await saveWaiver(null, fd(FULL_WAIVER));

    expect(result).toEqual({ error: "Not authenticated." });
  });

  it("returns an error when the form is incomplete and no file_url is given", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1" } } });

    // Only agreed field set; all name/signature fields empty.
    const result = await saveWaiver(null, fd({ agreed: "on", file_url: "" }));

    expect(result?.error).toBeTruthy();
  });

  it("returns success when all form fields are filled and agreed is checked", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1" } } });
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));

    const result = await saveWaiver(null, fd(FULL_WAIVER));

    expect(result).toEqual({ success: true });
  });

  it("returns success when only a file_url is provided (PDF upload path)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1" } } });
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));

    // A storage path alone satisfies isComplete — no form fields needed.
    const result = await saveWaiver(
      null,
      fd({ file_url: "u-1/waiver.pdf", agreed: "off" })
    );

    expect(result).toEqual({ success: true });
  });

  it("surfaces the database error when the upsert fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1" } } });
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: null, error: { message: "DB connection error" } })
    );

    const result = await saveWaiver(null, fd(FULL_WAIVER));

    expect(result).toEqual({ error: "DB connection error" });
  });
});

// ---------------------------------------------------------------------------
// upsertSubmission — waiver gate
// ---------------------------------------------------------------------------

const SUBMISSION = {
  title: "Solar Tracker",
  description: "We built it.",
  ai_description: "",
  help_received: "",
  file_url: "https://example.com/project.pdf",
  category: "STEM",
  status: "submitted",
};

describe("upsertSubmission — waiver gate", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockFrom.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1" } } });
  });

  it("blocks a final submission when the user has no completed waiver", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles")
        return makeBuilder({ data: { team_id: "t-1", role: "student" }, error: null });
      // waivers query returns no row
      return makeBuilder({ data: null, error: null });
    });

    const result = await upsertSubmission(null, fd(SUBMISSION));

    expect(result?.error).toMatch(/waiver/i);
  });

  it("allows a draft submission when the user has no completed waiver", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles")
        return makeBuilder({ data: { team_id: "t-1", role: "student" }, error: null });
      if (table === "submissions")
        return makeBuilder({ data: null, error: null });
      return makeBuilder({ data: null, error: null });
    });

    const result = await upsertSubmission(null, fd({ ...SUBMISSION, status: "draft" }));

    expect(result).toEqual({ success: true });
  });

  it("allows a final submission when the waiver is completed", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles")
        return makeBuilder({ data: { team_id: "t-1", role: "student" }, error: null });
      if (table === "waivers")
        return makeBuilder({
          data: { completed_at: "2026-10-01T00:00:00Z" },
          error: null,
        });
      if (table === "submissions")
        return makeBuilder({ data: null, error: null });
      return makeBuilder({ data: null, error: null });
    });

    const result = await upsertSubmission(null, fd(SUBMISSION));

    expect(result).toEqual({ success: true });
  });

  it("blocks a mentor from submitting", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles")
        return makeBuilder({ data: { team_id: "t-1", role: "mentor" }, error: null });
      return makeBuilder({ data: null, error: null });
    });

    const result = await upsertSubmission(null, fd(SUBMISSION));

    expect(result).toEqual({ error: "Mentors cannot submit." });
  });

  it("blocks a submission when the user has no team", async () => {
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { team_id: null, role: "student" }, error: null })
    );

    const result = await upsertSubmission(null, fd(SUBMISSION));

    expect(result?.error).toBeTruthy();
  });

  it("rejects an invalid category", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles")
        return makeBuilder({ data: { team_id: "t-1", role: "student" }, error: null });
      if (table === "waivers")
        return makeBuilder({ data: { completed_at: "2026-10-01T00:00:00Z" }, error: null });
      return makeBuilder({ data: null, error: null });
    });

    const result = await upsertSubmission(
      null,
      fd({ ...SUBMISSION, category: "INVALID" })
    );

    expect(result).toEqual({ error: "Invalid category." });
  });
});
