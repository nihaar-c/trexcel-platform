import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeQuery } from "../../helpers/query";

const mockGetUser = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

const { setCheckpoint } = await import("@/app/admin/teams/actions");

function setup({
  user = { id: "admin-1" } as unknown,
  role = "admin",
  error = null as unknown,
} = {}) {
  mockGetUser.mockResolvedValue({ data: { user } });
  const b = {
    profiles: makeQuery({ data: { role } }),
    checkpoint_submissions: makeQuery({ data: null, error }),
  };
  mockFrom.mockImplementation((t: keyof typeof b) => b[t]);
  return b;
}

beforeEach(() => vi.clearAllMocks());

describe("setCheckpoint (admin)", () => {
  it("rejects invalid checkpoint numbers", async () => {
    setup();
    expect(await setCheckpoint("t-1", 5, true)).toEqual({ error: "Invalid checkpoint." });
    expect(await setCheckpoint("t-1", 0, true)).toEqual({ error: "Invalid checkpoint." });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    setup({ user: null });
    expect(await setCheckpoint("t-1", 1, true)).toEqual({ error: "Not authenticated." });
  });

  it.each(["student", "judge", "mentor"])("rejects non-admin role %s", async (role) => {
    const b = setup({ role });
    expect(await setCheckpoint("t-1", 1, true)).toEqual({ error: "Admins only." });
    expect(b.checkpoint_submissions.upsert).not.toHaveBeenCalled();
    expect(b.checkpoint_submissions.delete).not.toHaveBeenCalled();
  });

  it("checking upserts an idempotent row attributed to the admin", async () => {
    const b = setup();
    expect(await setCheckpoint("t-1", 2, true)).toEqual({});
    expect(b.checkpoint_submissions.upsert).toHaveBeenCalledWith(
      { team_id: "t-1", checkpoint: 2, submitted_by: "admin-1" },
      { onConflict: "team_id,checkpoint", ignoreDuplicates: true },
    );
    expect(b.checkpoint_submissions.delete).not.toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/teams");
  });

  it("unchecking deletes only that team's checkpoint row", async () => {
    const b = setup();
    expect(await setCheckpoint("t-1", 1, false)).toEqual({});
    expect(b.checkpoint_submissions.delete).toHaveBeenCalled();
    expect(b.checkpoint_submissions.eq).toHaveBeenCalledWith("team_id", "t-1");
    expect(b.checkpoint_submissions.eq).toHaveBeenCalledWith("checkpoint", 1);
    expect(b.checkpoint_submissions.upsert).not.toHaveBeenCalled();
  });

  it("allows checkpoints 3 and 4", async () => {
    setup();
    expect(await setCheckpoint("t-1", 3, true)).toEqual({});
    expect(await setCheckpoint("t-1", 4, true)).toEqual({});
  });

  it("returns database errors without revalidating", async () => {
    setup({ error: { message: "boom" } });
    expect(await setCheckpoint("t-1", 1, true)).toEqual({ error: "boom" });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
