import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFrom = vi.hoisted(() => vi.fn());
const mockGetUser = vi.hoisted(() => vi.fn());
const mockRedirect = vi.hoisted(() =>
  vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT:${url}`); }),
);

vi.mock("@/lib/features", () => ({ SUBMISSIONS_ENABLED: false }));
vi.mock("next/navigation", () => ({ redirect: mockRedirect }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/link", () => ({ default: ({ children }: { children: unknown }) => children }));
vi.mock("resend", () => ({ Resend: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

const { upsertSubmission, saveTeamOverview } = await import("@/app/dashboard/actions");
const { default: SubmissionsPage } = await import("@/app/dashboard/submissions/page");

beforeEach(() => vi.clearAllMocks());

describe("submissions feature flag (disabled)", () => {
  it("upsertSubmission refuses and never queries", async () => {
    const res = await upsertSubmission(null, new FormData());
    expect(res).toEqual({ error: "Submissions are currently disabled." });
    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("saveTeamOverview refuses and never queries", async () => {
    const res = await saveTeamOverview(null, new FormData());
    expect(res).toEqual({ error: "Submissions are currently disabled." });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("/dashboard/submissions redirects to /dashboard before loading data", async () => {
    await expect(SubmissionsPage()).rejects.toThrow("NEXT_REDIRECT:/dashboard");
    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
