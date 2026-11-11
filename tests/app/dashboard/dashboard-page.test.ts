import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { REQUIRED_PROFILE_FIELDS } from "@/lib/profile";
import { makeQuery } from "../../helpers/query";

const mockGetUser = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockCookies = vi.hoisted(() => vi.fn());
const tabs = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT:${url}`); }),
}));
vi.mock("next/headers", () => ({ cookies: mockCookies }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));
vi.mock("@/app/dashboard/DashboardTabs", () => ({
  default: (props: Record<string, unknown>) => {
    tabs.props = props;
    return null;
  },
}));

const { default: Page } = await import("@/app/dashboard/page");

const FULL = Object.fromEntries(REQUIRED_PROFILE_FIELDS.map((f) => [f, "x"]));

function setup({
  profile = { role: "student", team_id: "t-1" } as unknown,
  details = FULL as unknown,
  waiver = { completed_at: "2026-10-01T00:00:00Z" } as unknown,
  checkpoints = [{ checkpoint: 1 }] as unknown,
  viewAs = undefined as string | undefined,
} = {}) {
  mockGetUser.mockResolvedValue({ data: { user: { id: "u-1", email: "s@x.com" } } });
  mockCookies.mockResolvedValue({
    get: (k: string) => (k === "trexcel-view-as" && viewAs ? { value: viewAs } : undefined),
  });
  const b = {
    profiles: makeQuery({ data: profile }),
    teams: makeQuery({ data: { team_name: "Rex", invite_code: "ABC123", count: 1 } }),
    student_details: makeQuery({ data: details }),
    waivers: makeQuery({ data: waiver }),
    checkpoint_submissions: makeQuery({ data: checkpoints }),
  };
  mockFrom.mockImplementation((t: keyof typeof b) => b[t]);
  return b;
}

const render = async () => {
  renderToStaticMarkup((await Page()) as ReactElement);
};

beforeEach(() => {
  vi.clearAllMocks();
  tabs.props = null;
});

describe("DashboardPage checkpoint wiring", () => {
  it("passes completed checkpoints for the student's team", async () => {
    const b = setup({ checkpoints: [{ checkpoint: 1 }, { checkpoint: 2 }] });
    await render();
    expect(tabs.props?.checkpointsDone).toEqual([1, 2]);
    expect(b.checkpoint_submissions.eq).toHaveBeenCalledWith("team_id", "t-1");
  });

  it("marks profile and waiver complete when both are done", async () => {
    setup();
    await render();
    expect(tabs.props).toMatchObject({ profileComplete: true, waiverComplete: true });
  });

  it("profileComplete is false when the avatar is missing", async () => {
    setup({ details: { ...FULL, avatar_url: null } });
    await render();
    expect(tabs.props).toMatchObject({ profileComplete: false, waiverComplete: true });
  });

  it("waiverComplete is false when the waiver is missing or unfinished", async () => {
    setup({ waiver: null });
    await render();
    expect(tabs.props).toMatchObject({ profileComplete: true, waiverComplete: false });

    setup({ waiver: { completed_at: null } });
    await render();
    expect(tabs.props).toMatchObject({ waiverComplete: false });
  });

  it("treats a student with no details row as incomplete", async () => {
    setup({ details: null });
    await render();
    expect(tabs.props?.profileComplete).toBe(false);
  });

  it("does not query checkpoints for a student without a team", async () => {
    const b = setup({ profile: { role: "student", team_id: null } });
    await render();
    expect(b.checkpoint_submissions.select).not.toHaveBeenCalled();
    expect(tabs.props?.checkpointsDone).toEqual([]);
  });

  it("does not query checkpoints for mentors", async () => {
    const b = setup({ profile: { role: "mentor", team_id: "t-1" } });
    await render();
    expect(b.checkpoint_submissions.select).not.toHaveBeenCalled();
    expect(tabs.props?.checkpointsDone).toEqual([]);
  });

  it("an admin viewing as a student gets the student checkpoint data", async () => {
    const b = setup({ profile: { role: "admin", team_id: "t-1" }, viewAs: "student" });
    await render();
    expect(b.checkpoint_submissions.select).toHaveBeenCalled();
  });
});
