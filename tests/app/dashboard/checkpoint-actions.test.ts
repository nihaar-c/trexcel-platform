import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeQuery } from "../../helpers/query";
import { REQUIRED_PROFILE_FIELDS } from "@/lib/profile";

const FULL = Object.fromEntries(REQUIRED_PROFILE_FIELDS.map((f) => [f, "x"]));

const mockGetUser = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("resend", () => ({ Resend: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

const { confirmCheckpoint } = await import("@/app/dashboard/actions");

function setup({
  user = { id: "u-1" } as unknown,
  profile = { team_id: "t-1", role: "student" } as unknown,
  details = FULL as unknown,
  waiver = { completed_at: "2026-10-01T00:00:00Z" } as unknown,
  insertError = null as unknown,
} = {}) {
  mockGetUser.mockResolvedValue({ data: { user } });
  const b = {
    profiles: makeQuery({ data: profile }),
    waivers: makeQuery({ data: waiver }),
    student_details: makeQuery({ data: details }),
    checkpoint_submissions: makeQuery({ data: null, error: insertError }),
  };
  mockFrom.mockImplementation((t: keyof typeof b) => b[t]);
  return b;
}

beforeEach(() => vi.clearAllMocks());

describe("confirmCheckpoint", () => {
  it("rejects unknown checkpoints without touching the database", async () => {
    setup();
    expect(await confirmCheckpoint(3)).toEqual({ error: "Invalid checkpoint." });
    expect(await confirmCheckpoint(0)).toEqual({ error: "Invalid checkpoint." });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    setup({ user: null });
    expect(await confirmCheckpoint(1)).toEqual({ error: "Not authenticated." });
  });

  it("requires the user to be on a team", async () => {
    setup({ profile: { team_id: null, role: "student" } });
    const res = await confirmCheckpoint(1);
    expect(res.error).toMatch(/team/i);
  });

  it("blocks mentors", async () => {
    const b = setup({ profile: { team_id: "t-1", role: "mentor" } });
    expect(await confirmCheckpoint(1)).toEqual({ error: "Mentors cannot submit." });
    expect(b.checkpoint_submissions.insert).not.toHaveBeenCalled();
  });

  it.each([null, { completed_at: null }])(
    "blocks confirmation when the waiver is incomplete (%j)",
    async (waiver) => {
      const b = setup({ waiver });
      const res = await confirmCheckpoint(1);
      expect(res.error).toMatch(/waiver/i);
      expect(b.checkpoint_submissions.insert).not.toHaveBeenCalled();
    },
  );

  it("blocks confirmation when the profile is missing entirely", async () => {
    const b = setup({ details: null });
    const res = await confirmCheckpoint(1);
    expect(res.error).toMatch(/complete your profile/i);
    expect(b.checkpoint_submissions.insert).not.toHaveBeenCalled();
  });

  it.each(REQUIRED_PROFILE_FIELDS)(
    "blocks confirmation when %s is blank (incl. profile picture)",
    async (field) => {
      const b = setup({ details: { ...FULL, [field]: null } });
      const res = await confirmCheckpoint(1);
      expect(res.error).toMatch(/profile picture/i);
      expect(b.checkpoint_submissions.insert).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    },
  );

  it("inserts a row for the user's team and revalidates", async () => {
    const b = setup();
    expect(await confirmCheckpoint(2)).toEqual({ success: true });
    expect(b.checkpoint_submissions.insert).toHaveBeenCalledWith({
      team_id: "t-1",
      checkpoint: 2,
      submitted_by: "u-1",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("treats a duplicate (teammate already confirmed) as success", async () => {
    setup({ insertError: { code: "23505", message: "duplicate key" } });
    expect(await confirmCheckpoint(1)).toEqual({ success: true });
  });

  it("surfaces other database errors", async () => {
    setup({ insertError: { code: "42501", message: "RLS violation" } });
    expect(await confirmCheckpoint(1)).toEqual({ error: "RLS violation" });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
