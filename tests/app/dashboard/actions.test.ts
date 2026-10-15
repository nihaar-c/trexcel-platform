import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock primitives
// ---------------------------------------------------------------------------
const mockGetUser = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockRpc = vi.hoisted(() => vi.fn());
const mockRedirect = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect: mockRedirect }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));

vi.mock("resend", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Resend: vi.fn().mockImplementation(function (this: any) {
    this.emails = { send: vi.fn().mockResolvedValue({ error: null }) };
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

const {
  createTeam,
  joinTeam,
  saveTeamOverview,
  saveMentorRequest,
  saveStudentInfo,
  upsertSubmission,
  saveWaiver,
} = await import("@/app/dashboard/actions");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    then: (res, rej) => Promise.resolve(result).then(res, rej),
  };

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

function authed(id = "u-1") {
  mockGetUser.mockResolvedValue({
    data: { user: { id, email: `${id}@test.com` } },
  });
}

function notAuthed() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

// ---------------------------------------------------------------------------
// createTeam
// ---------------------------------------------------------------------------

describe("createTeam", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockFrom.mockReset();
    mockRedirect.mockReset();
  });

  it("returns an error when not authenticated", async () => {
    notAuthed();
    expect(await createTeam(null, fd({ team_name: "Team A" }))).toEqual({
      error: "Not authenticated.",
    });
  });

  it("returns an error when the user already has a team", async () => {
    authed();
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { team_id: "existing-team" }, error: null })
    );
    const result = await createTeam(null, fd({ team_name: "Team A" }));
    expect(result?.error).toMatch(/already on a team/i);
  });

  it("returns an error when team_name is blank", async () => {
    authed();
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { team_id: null }, error: null })
    );
    expect(await createTeam(null, fd({ team_name: "   " }))).toEqual({
      error: "Team name is required.",
    });
  });

  it("returns an error when team_name exceeds 100 characters", async () => {
    authed();
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { team_id: null }, error: null })
    );
    const result = await createTeam(null, fd({ team_name: "X".repeat(101) }));
    expect(result?.error).toMatch(/100 characters/);
  });

  it("returns an error when the teams INSERT fails", async () => {
    authed();
    mockFrom
      .mockImplementationOnce(() =>
        makeBuilder({ data: { team_id: null }, error: null })
      )
      .mockImplementationOnce(() =>
        makeBuilder({ data: null, error: { message: "unique violation" } })
      );
    expect(await createTeam(null, fd({ team_name: "Team A" }))).toEqual({
      error: "unique violation",
    });
  });

  it("returns an error when the profile team_id UPDATE fails", async () => {
    authed();
    mockFrom
      .mockImplementationOnce(() =>
        makeBuilder({ data: { team_id: null }, error: null })
      )
      .mockImplementationOnce(() =>
        makeBuilder({ data: { id: "team-1" }, error: null })
      )
      .mockImplementationOnce(() =>
        makeBuilder({ data: null, error: { message: "rls denied" } })
      );
    expect(await createTeam(null, fd({ team_name: "Team A" }))).toEqual({
      error: "rls denied",
    });
  });

  it("redirects to /dashboard on success", async () => {
    authed();
    mockFrom
      .mockImplementationOnce(() =>
        makeBuilder({ data: { team_id: null }, error: null })
      )
      .mockImplementationOnce(() =>
        makeBuilder({ data: { id: "team-1" }, error: null })
      )
      .mockImplementationOnce(() => makeBuilder({ data: null, error: null }));
    await createTeam(null, fd({ team_name: "Team A" }));
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });

  it("inserts the team with count=1 and a valid 6-char uppercase hex invite code", async () => {
    authed();
    const teamsBuilder = makeBuilder({ data: { id: "team-1" }, error: null });
    mockFrom
      .mockImplementationOnce(() =>
        makeBuilder({ data: { team_id: null }, error: null })
      )
      .mockImplementationOnce(() => teamsBuilder)
      .mockImplementationOnce(() => makeBuilder({ data: null, error: null }));
    await createTeam(null, fd({ team_name: "Rockets" }));
    const [[payload]] = (teamsBuilder.insert as ReturnType<typeof vi.fn>).mock.calls;
    expect((payload as Record<string, unknown>).count).toBe(1);
    expect((payload as Record<string, unknown>).team_name).toBe("Rockets");
    expect((payload as Record<string, unknown>).invite_code).toMatch(/^[A-F0-9]{6}$/);
  });
});

// ---------------------------------------------------------------------------
// joinTeam
// ---------------------------------------------------------------------------

describe("joinTeam", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockFrom.mockReset();
    mockRpc.mockReset();
    mockRedirect.mockReset();
  });

  it("returns an error when not authenticated", async () => {
    notAuthed();
    expect(await joinTeam(null, fd({ invite_code: "A1B2C3" }))).toEqual({
      error: "Not authenticated.",
    });
  });

  it("returns an error when the user already has a team", async () => {
    authed();
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { team_id: "some-team" }, error: null })
    );
    const result = await joinTeam(null, fd({ invite_code: "A1B2C3" }));
    expect(result?.error).toMatch(/already on a team/i);
  });

  it("returns an error when invite_code is empty", async () => {
    authed();
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { team_id: null }, error: null })
    );
    expect(await joinTeam(null, fd({ invite_code: "" }))).toEqual({
      error: "Invite code is required.",
    });
  });

  it("returns an error for a malformed invite code (wrong length or characters)", async () => {
    authed();
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { team_id: null }, error: null })
    );
    expect(await joinTeam(null, fd({ invite_code: "ABCD" }))).toEqual({
      error: "Invalid invite code format.",
    });
    expect(await joinTeam(null, fd({ invite_code: "GGGGGG" }))).toEqual({
      error: "Invalid invite code format.",
    });
  });

  it("normalizes a lowercase code to uppercase before passing it to the RPC", async () => {
    authed();
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { team_id: null }, error: null })
    );
    mockRpc.mockResolvedValue({ data: { team_id: "t-1" }, error: null });
    await joinTeam(null, fd({ invite_code: "a1b2c3" }));
    expect(mockRpc).toHaveBeenCalledWith("join_team", {
      p_invite_code: "A1B2C3",
      p_user_id: "u-1",
    });
  });

  it("surfaces the error from the RPC when the team is not found or is full", async () => {
    authed();
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { team_id: null }, error: null })
    );
    mockRpc.mockResolvedValue({
      data: { error: "Team not found. Check the code and try again." },
      error: null,
    });
    expect(await joinTeam(null, fd({ invite_code: "A1B2C3" }))).toEqual({
      error: "Team not found. Check the code and try again.",
    });
  });

  it("returns an error when the Supabase RPC call itself fails", async () => {
    authed();
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { team_id: null }, error: null })
    );
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "function does not exist" },
    });
    expect(await joinTeam(null, fd({ invite_code: "A1B2C3" }))).toEqual({
      error: "function does not exist",
    });
  });

  it("redirects to /dashboard on success", async () => {
    authed();
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { team_id: null }, error: null })
    );
    mockRpc.mockResolvedValue({ data: { team_id: "t-1" }, error: null });
    await joinTeam(null, fd({ invite_code: "A1B2C3" }));
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });
});

// ---------------------------------------------------------------------------
// saveTeamOverview
// ---------------------------------------------------------------------------

describe("saveTeamOverview", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockFrom.mockReset();
    mockRevalidatePath.mockReset();
  });

  it("returns an error when not authenticated", async () => {
    notAuthed();
    expect(
      await saveTeamOverview(null, fd({ theme: "Science", memo: "notes" }))
    ).toEqual({ error: "Not authenticated." });
  });

  it("returns an error when the user has no team", async () => {
    authed();
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { team_id: null }, error: null })
    );
    expect(await saveTeamOverview(null, fd({ theme: "", memo: "" }))).toEqual({
      error: "No team found.",
    });
  });

  it("returns an error when the DB update fails", async () => {
    authed();
    mockFrom
      .mockImplementationOnce(() =>
        makeBuilder({ data: { team_id: "t-1" }, error: null })
      )
      .mockImplementationOnce(() =>
        makeBuilder({ data: null, error: { message: "write failed" } })
      );
    expect(
      await saveTeamOverview(null, fd({ theme: "Science", memo: "notes" }))
    ).toEqual({ error: "write failed" });
  });

  it("returns success and revalidates /dashboard/submissions", async () => {
    authed();
    mockFrom
      .mockImplementationOnce(() =>
        makeBuilder({ data: { team_id: "t-1" }, error: null })
      )
      .mockImplementationOnce(() => makeBuilder({ data: null, error: null }));
    expect(
      await saveTeamOverview(null, fd({ theme: "Science", memo: "Great project!" }))
    ).toEqual({ success: true });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/submissions");
  });
});

// ---------------------------------------------------------------------------
// saveMentorRequest
// ---------------------------------------------------------------------------

describe("saveMentorRequest", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockFrom.mockReset();
  });

  it("returns an error when not authenticated", async () => {
    notAuthed();
    expect(await saveMentorRequest(null, fd({ memo: "need help" }))).toEqual({
      error: "Not authenticated.",
    });
  });

  it("returns success when a memo is provided", async () => {
    authed();
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
    expect(
      await saveMentorRequest(null, fd({ memo: "I need a STEM mentor" }))
    ).toEqual({ success: true });
  });

  it("returns success when memo is empty (memo is optional)", async () => {
    authed();
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
    expect(await saveMentorRequest(null, fd({ memo: "" }))).toEqual({
      success: true,
    });
  });

  it("returns an error when the DB update fails", async () => {
    authed();
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: null, error: { message: "column missing" } })
    );
    expect(await saveMentorRequest(null, fd({ memo: "help!" }))).toEqual({
      error: "column missing",
    });
  });
});

// ---------------------------------------------------------------------------
// saveStudentInfo
// ---------------------------------------------------------------------------

const BASE_STUDENT_FORM: Record<string, string> = {
  school_name: "Springfield High",
  student_id: "SHS-001",
  first_name: "Bart",
  last_name: "Simpson",
  phone: "555-1234",
  gender_option: "Male",
  race: "White",
  parent_first_name: "Homer",
  parent_last_name: "Simpson",
  parent_email: "homer@springfield.com",
  parent_phone: "555-5678",
  address: "742 Evergreen Terrace",
  city: "Springfield",
  state: "IL",
  zip_code: "62701",
  existing_avatar_url: "",
};

describe("saveStudentInfo", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockFrom.mockReset();
    mockRevalidatePath.mockReset();
  });

  it("returns an error when not authenticated", async () => {
    notAuthed();
    expect(await saveStudentInfo(null, fd(BASE_STUDENT_FORM))).toEqual({
      error: "Not authenticated.",
    });
  });

  it("returns success and revalidates /dashboard on valid data", async () => {
    authed();
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
    expect(await saveStudentInfo(null, fd(BASE_STUDENT_FORM))).toEqual({
      success: true,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("uses the custom text when gender_option is Other", async () => {
    authed();
    const builder = makeBuilder({ data: null, error: null });
    mockFrom.mockImplementation(() => builder);
    await saveStudentInfo(
      null,
      fd({ ...BASE_STUDENT_FORM, gender_option: "Other", gender_other: "Genderqueer" })
    );
    const [[payload]] = (builder.upsert as ReturnType<typeof vi.fn>).mock.calls;
    expect((payload as Record<string, unknown>).gender).toBe("Genderqueer");
  });

  it("falls back to 'Other' when gender_option is Other but gender_other is blank", async () => {
    authed();
    const builder = makeBuilder({ data: null, error: null });
    mockFrom.mockImplementation(() => builder);
    await saveStudentInfo(
      null,
      fd({ ...BASE_STUDENT_FORM, gender_option: "Other", gender_other: "" })
    );
    const [[payload]] = (builder.upsert as ReturnType<typeof vi.fn>).mock.calls;
    expect((payload as Record<string, unknown>).gender).toBe("Other");
  });

  it("uses a preset gender directly (no custom text lookup)", async () => {
    authed();
    const builder = makeBuilder({ data: null, error: null });
    mockFrom.mockImplementation(() => builder);
    await saveStudentInfo(
      null,
      fd({ ...BASE_STUDENT_FORM, gender_option: "Female", gender_other: "ignored" })
    );
    const [[payload]] = (builder.upsert as ReturnType<typeof vi.fn>).mock.calls;
    expect((payload as Record<string, unknown>).gender).toBe("Female");
  });

  it("returns an error when the DB upsert fails", async () => {
    authed();
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: null, error: { message: "constraint violation" } })
    );
    expect(await saveStudentInfo(null, fd(BASE_STUDENT_FORM))).toEqual({
      error: "constraint violation",
    });
  });
});

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

const SUBMITTED: Record<string, string> = {
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
      return makeBuilder({ data: null, error: null });
    });
    const result = await upsertSubmission(null, fd(SUBMITTED));
    expect(result?.error).toMatch(/waiver/i);
  });

  it("allows a draft submission when the user has no completed waiver", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles")
        return makeBuilder({ data: { team_id: "t-1", role: "student" }, error: null });
      return makeBuilder({ data: null, error: null });
    });
    const result = await upsertSubmission(null, fd({ ...SUBMITTED, status: "draft" }));
    expect(result).toEqual({ success: true });
  });

  it("allows a final submission when the waiver is completed", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles")
        return makeBuilder({ data: { team_id: "t-1", role: "student" }, error: null });
      if (table === "waivers")
        return makeBuilder({ data: { completed_at: "2026-10-01T00:00:00Z" }, error: null });
      return makeBuilder({ data: null, error: null });
    });
    const result = await upsertSubmission(null, fd(SUBMITTED));
    expect(result).toEqual({ success: true });
  });

  it("blocks a mentor from submitting", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles")
        return makeBuilder({ data: { team_id: "t-1", role: "mentor" }, error: null });
      return makeBuilder({ data: null, error: null });
    });
    const result = await upsertSubmission(null, fd(SUBMITTED));
    expect(result).toEqual({ error: "Mentors cannot submit." });
  });

  it("blocks a submission when the user has no team", async () => {
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { team_id: null, role: "student" }, error: null })
    );
    const result = await upsertSubmission(null, fd(SUBMITTED));
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
    const result = await upsertSubmission(null, fd({ ...SUBMITTED, category: "INVALID" }));
    expect(result).toEqual({ error: "Invalid category." });
  });
});

// ---------------------------------------------------------------------------
// upsertSubmission — submitted_at stamping
// ---------------------------------------------------------------------------

describe("upsertSubmission — submitted_at", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockFrom.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1" } } });
  });

  function setupWithWaiver() {
    // Returns a builder that captures upsert payload for the submissions table
    const submissionsBuilder = makeBuilder({ data: null, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles")
        return makeBuilder({ data: { team_id: "t-1", role: "student" }, error: null });
      if (table === "waivers")
        return makeBuilder({ data: { completed_at: "2026-10-01T00:00:00Z" }, error: null });
      return submissionsBuilder;
    });

    return submissionsBuilder;
  }

  it("does NOT include submitted_at in the upsert payload when saving a draft", async () => {
    const builder = setupWithWaiver();
    await upsertSubmission(null, fd({ ...SUBMITTED, status: "draft" }));
    const [[payload]] = (builder.upsert as ReturnType<typeof vi.fn>).mock.calls;
    expect(payload as Record<string, unknown>).not.toHaveProperty("submitted_at");
  });

  it("DOES include submitted_at in the upsert payload on final submission", async () => {
    const builder = setupWithWaiver();
    await upsertSubmission(null, fd(SUBMITTED));
    const [[payload]] = (builder.upsert as ReturnType<typeof vi.fn>).mock.calls;
    expect(payload as Record<string, unknown>).toHaveProperty("submitted_at");
    expect(typeof (payload as Record<string, unknown>).submitted_at).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// upsertSubmission — file URL validation
// ---------------------------------------------------------------------------

describe("upsertSubmission — file URL validation", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockFrom.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1" } } });

    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles")
        return makeBuilder({ data: { team_id: "t-1", role: "student" }, error: null });
      if (table === "waivers")
        return makeBuilder({ data: { completed_at: "2026-10-01T00:00:00Z" }, error: null });
      return makeBuilder({ data: null, error: null });
    });
  });

  it("rejects a non-HTTPS file URL", async () => {
    const result = await upsertSubmission(
      null,
      fd({ ...SUBMITTED, file_url: "http://example.com/file.pdf" })
    );
    expect(result?.error).toMatch(/https/i);
  });

  it("rejects a completely malformed file URL", async () => {
    const result = await upsertSubmission(
      null,
      fd({ ...SUBMITTED, file_url: "not-a-url" })
    );
    expect(result?.error).toMatch(/url/i);
  });

  it("accepts a valid HTTPS file URL", async () => {
    const result = await upsertSubmission(null, fd(SUBMITTED));
    expect(result).toEqual({ success: true });
  });

  it("accepts an empty file_url (submission without a file link)", async () => {
    const result = await upsertSubmission(
      null,
      fd({ ...SUBMITTED, file_url: "" })
    );
    expect(result).toEqual({ success: true });
  });
});
