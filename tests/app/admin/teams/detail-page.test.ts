import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { makeQuery } from "../../../helpers/query";

const mockNotFound = vi.hoisted(() =>
  vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
);
const mockFrom = vi.hoisted(() => vi.fn());
const captured = vi.hoisted(() => ({ props: null as any }));

vi.mock("next/navigation", () => ({ notFound: mockNotFound }));
vi.mock("next/link", () => ({ default: ({ children }: any) => children }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));
vi.mock("@/app/admin/teams/[id]/TeamDetailTabs", () => ({
  default: (props: unknown) => {
    captured.props = props;
    return null;
  },
}));

const { default: Page } = await import("@/app/admin/teams/[id]/page");

const STEM = { id: "s1", category: "STEM", title: "Solar", status: "submitted" };
const ART = { id: "s2", category: "ART", title: "Mural", status: "draft" };

function setup({
  team = { id: "t-1", team_name: "Team Alpha", count: 3 } as unknown,
  submissions = [STEM, ART] as unknown,
} = {}) {
  const builders = {
    teams: makeQuery({ data: team }),
    profiles: makeQuery({ data: [{ id: "u1", email: "a@x.com", role: "student", team_id: "t-1" }] }),
    submissions: makeQuery({ data: submissions }),
    judging_scores: makeQuery({ data: [] }),
    student_details: makeQuery({ data: null }),
  };
  mockFrom.mockImplementation((t: keyof typeof builders) => builders[t]);
  return builders;
}

async function render(id = "t-1") {
  const jsx = await Page({ params: Promise.resolve({ id }) });
  return renderToStaticMarkup(jsx as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  captured.props = null;
});

describe("AdminTeamDetailPage — submissions", () => {
  it("fetches every submission for the team, ordered by category", async () => {
    const b = setup();
    await render("t-1");
    expect(b.submissions.eq).toHaveBeenCalledWith("team_id", "t-1");
    expect(b.submissions.order).toHaveBeenCalledWith("category");
  });

  it("does not use maybeSingle/single for submissions (errors when a team has >1 row)", async () => {
    const b = setup();
    await render();
    expect(b.submissions.maybeSingle).not.toHaveBeenCalled();
    expect(b.submissions.single).not.toHaveBeenCalled();
  });

  it("selects the fields the submission cards display", async () => {
    const b = setup();
    await render();
    const [cols] = b.submissions.select.mock.calls[0];
    for (const f of ["title", "description", "ai_description", "help_received", "file_url", "category", "status", "submitted_at"]) {
      expect(cols).toContain(f);
    }
  });

  it("passes all submissions to the tabs", async () => {
    setup();
    await render();
    expect(captured.props.submissions).toEqual([STEM, ART]);
  });

  it("passes an empty array when the query returns no data", async () => {
    setup({ submissions: null });
    await render();
    expect(captured.props.submissions).toEqual([]);
  });
});

describe("AdminTeamDetailPage — team lookup", () => {
  it("calls notFound() when the team does not exist", async () => {
    setup({ team: null });
    await expect(render("nope")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalledOnce();
  });

  it("renders the team name and member count", async () => {
    setup();
    const html = await render();
    expect(html).toContain("Team Alpha");
    expect(html).toContain("3 members");
  });
});
