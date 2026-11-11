import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { makeQuery } from "../../helpers/query";

const mockFrom = vi.hoisted(() => vi.fn());
const toggles = vi.hoisted(() => ({ calls: [] as Record<string, unknown>[] }));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => createElement("a", { href }, children),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));
vi.mock("@/app/admin/teams/CheckpointToggles", () => ({
  default: (props: Record<string, unknown>) => {
    toggles.calls.push(props);
    return null;
  },
}));

const { default: Page } = await import("@/app/admin/teams/page");

let teamsQuery: ReturnType<typeof makeQuery>;

beforeEach(() => {
  toggles.calls = [];
  teamsQuery = makeQuery({
    data: [
      {
        id: "t-1",
        team_name: "Rex",
        count: 2,
        members: [{ id: "a", role: "student" }],
        submission: null,
        checkpoints: [{ checkpoint: 1 }, { checkpoint: 2 }],
      },
      {
        id: "t-2",
        team_name: "Nova",
        count: 1,
        members: [],
        submission: null,
        checkpoints: null,
      },
    ],
  });
  mockFrom.mockImplementation(() => teamsQuery);
});

describe("AdminTeamsPage checkpoints", () => {
  it("joins checkpoint_submissions in the teams query", async () => {
    await Page();
    const select = teamsQuery.select.mock.calls[0][0] as string;
    expect(select).toContain("checkpoints:checkpoint_submissions(checkpoint)");
  });

  it("renders one toggle group per team with its completed checkpoints", async () => {
    renderToStaticMarkup((await Page()) as ReactElement);
    expect(toggles.calls).toHaveLength(2);
    expect(toggles.calls[0]).toMatchObject({
      teamId: "t-1",
      checkpoints: [1, 2, 3, 4],
      initial: [1, 2],
    });
    expect(toggles.calls[1]).toMatchObject({ teamId: "t-2", initial: [] });
  });

  it("keeps the team name as a link to the detail page", async () => {
    const html = renderToStaticMarkup((await Page()) as ReactElement);
    expect(html).toContain('href="/admin/teams/t-1"');
    expect(html).toContain("Rex");
  });
});
