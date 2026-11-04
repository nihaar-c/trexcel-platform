import { beforeEach, describe, expect, it, vi } from "vitest";
import { REQUIRED_PROFILE_FIELDS } from "@/lib/profile";

const mockGetUser = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockNotify = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/notifications", async (orig) => ({
  ...(await orig<typeof import("@/lib/notifications")>()),
  notifyOrganizers: mockNotify,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

const { saveStudentInfo, saveMentorRequest, upsertSubmission } = await import(
  "@/app/dashboard/actions"
);

function builder(data: unknown, error: unknown = null) {
  const result = { data, error };
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "insert", "update"]) b[m] = vi.fn(() => b);
  b.single = vi.fn().mockResolvedValue(result);
  b.upsert = vi.fn().mockResolvedValue(result);
  b.then = (res: (v: unknown) => void, rej?: (e: unknown) => void) =>
    Promise.resolve(result).then(res, rej);
  return b;
}

function fd(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
}

beforeEach(() => {
  mockGetUser.mockReset();
  mockFrom.mockReset();
  mockNotify.mockReset();
  mockGetUser.mockResolvedValue({ data: { user: { id: "u-1", email: "s@test.com" } } });
});

describe("student profile saves", () => {
  it("never email individually (covered by the weekly digest)", async () => {
    mockFrom.mockImplementation(() => builder(null));
    await saveStudentInfo(
      null,
      fd({ first_name: "Ada", school_name: "Hopper High", existing_avatar_url: "https://example.com/a.png" }),
    );
    expect(mockNotify).not.toHaveBeenCalled();
  });
});

describe("mentorship request notification", () => {
  it("emails organizers when a request is submitted", async () => {
    mockFrom.mockImplementation(() => builder({ first_name: "Ada", last_name: "L" }));
    await saveMentorRequest(null, fd({ memo: "Need a <b>STEM</b> mentor" }));
    expect(mockNotify).toHaveBeenCalledTimes(1);
    const [subject, html] = mockNotify.mock.calls[0];
    expect(subject).toContain("Ada L");
    expect(html).toContain("&lt;b&gt;STEM&lt;/b&gt;");
  });

  it("does not email when the memo is unchanged", async () => {
    mockFrom.mockImplementation(() => builder({ mentor_request_memo: "same" }));
    await saveMentorRequest(null, fd({ memo: "same" }));
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("does not email when the memo is cleared", async () => {
    mockFrom.mockImplementation(() => builder(null));
    await saveMentorRequest(null, fd({ memo: "  " }));
    expect(mockNotify).not.toHaveBeenCalled();
  });
});

describe("submission notification", () => {
  const SUBMITTED = {
    title: "Solar Tracker",
    category: "STEM",
    file_url: "https://example.com/p.pdf",
    status: "submitted",
  };

  function setup(priorStatus?: string) {
    mockFrom.mockImplementation((table: string) => {
      if (table === "submissions") return builder(priorStatus ? { status: priorStatus } : null);
      if (table === "profiles") return builder({ team_id: "t-1", role: "student" });
      if (table === "waivers") return builder({ completed_at: "2026-10-01" });
      if (table === "student_details")
        return builder(Object.fromEntries(REQUIRED_PROFILE_FIELDS.map((f) => [f, "x"])));
      if (table === "teams") return builder({ team_name: "Rocket Team" });
      return builder(null);
    });
  }

  it("emails organizers with team and category on final submission", async () => {
    setup();
    await upsertSubmission(null, fd(SUBMITTED));
    expect(mockNotify).toHaveBeenCalledTimes(1);
    const [subject] = mockNotify.mock.calls[0];
    expect(subject).toContain("Rocket Team");
    expect(subject).toContain("STEM");
  });

  it("does not email on resubmission of an already-submitted entry", async () => {
    setup("submitted");
    await upsertSubmission(null, fd(SUBMITTED));
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("emails when a draft is finally submitted", async () => {
    setup("draft");
    await upsertSubmission(null, fd(SUBMITTED));
    expect(mockNotify).toHaveBeenCalledTimes(1);
  });

  it("does not email for drafts", async () => {
    setup();
    await upsertSubmission(null, fd({ ...SUBMITTED, status: "draft" }));
    expect(mockNotify).not.toHaveBeenCalled();
  });
});
