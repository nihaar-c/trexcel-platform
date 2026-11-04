import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { makeQuery } from "../../helpers/query";

const mockNotFound = vi.hoisted(() =>
  vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
);
const mockRedirect = vi.hoisted(() =>
  vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT:${url}`); }),
);
const mockGetUser = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const scoring = vi.hoisted(() => ({ props: null as any, renders: 0 }));

vi.mock("next/navigation", () => ({ notFound: mockNotFound, redirect: mockRedirect }));
vi.mock("next/link", () => ({ default: ({ children }: any) => children }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));
vi.mock("@/app/judge/[teamId]/ScoringView", () => ({
  default: (props: unknown) => {
    scoring.props = props;
    scoring.renders++;
    return null;
  },
}));

const { default: Page } = await import("@/app/judge/[teamId]/page");

const SUB_STEM = {
  category: "STEM",
  description: "Solar tracker description",
  file_url: "https://example.com/stem.pdf",
  submitted_at: "2026-10-20T12:00:00Z",
  status: "submitted",
};
const SUB_ART = {
  category: "art", // stored lowercase — rubric lookup must still match
  description: "Mural description",
  file_url: "https://example.com/art.pdf",
  submitted_at: "2026-10-21T12:00:00Z",
  status: "submitted",
};

const crit = (id: string, name: string) => ({
  id,
  name,
  min_score: 0,
  max_score: 10,
  score_weight: 1,
  display_order: 1,
});
const RUBRIC = [
  { id: "rc1", name: "Presentation", rubric_type: "ART", display_order: 1, criteria: [crit("c-art", "Clarity")] },
  { id: "rc2", name: "Presentation", rubric_type: "STEM", display_order: 1, criteria: [crit("c-stem", "Rigor")] },
];

function setup({
  assigned = true,
  submissions = [SUB_STEM] as unknown[],
  rubric = RUBRIC as unknown[],
  scores = [] as unknown[],
} = {}) {
  const b = {
    judging_assignments: makeQuery({ data: assigned ? { team_id: "t-1" } : null }),
    teams: makeQuery({ data: { team_name: "Team Alpha", count: 2, members: [] } }),
    submissions: makeQuery({ data: submissions }),
    judging_scores: makeQuery({ data: scores }),
    rubric_categories: makeQuery({ data: rubric }),
  };
  mockFrom.mockImplementation((t: keyof typeof b) => b[t]);
  return b;
}

async function render() {
  const jsx = await Page({ params: Promise.resolve({ teamId: "t-1" }) });
  return renderToStaticMarkup(jsx as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  scoring.props = null;
  scoring.renders = 0;
  mockGetUser.mockResolvedValue({ data: { user: { id: "judge-1" } } });
});

describe("JudgeScoringPage — access", () => {
  it("redirects to /login when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    setup();
    await expect(render()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("404s when the judge is not assigned to the team", async () => {
    setup({ assigned: false });
    await expect(render()).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("JudgeScoringPage — submissions", () => {
  it("loads all of the team's submissions as a list, not a single row", async () => {
    const b = setup();
    await render();
    expect(b.submissions.eq).toHaveBeenCalledWith("team_id", "t-1");
    expect(b.submissions.order).toHaveBeenCalledWith("category");
    expect(b.submissions.maybeSingle).not.toHaveBeenCalled();
    expect(b.submissions.single).not.toHaveBeenCalled();
  });

  it("renders a card for every submission", async () => {
    setup({ submissions: [SUB_STEM, SUB_ART] });
    const html = await render();
    expect(html).toContain("Solar tracker description");
    expect(html).toContain("Mural description");
    expect(html).toContain('href="https://example.com/stem.pdf"');
    expect(html).toContain('href="https://example.com/art.pdf"');
    expect(html).toContain("STEM ·");
    expect(html).toContain("ART ·");
  });

  it("omits the download link for a submission without a file", async () => {
    setup({ submissions: [{ ...SUB_STEM, file_url: null }] });
    expect(await render()).not.toContain("Download submission");
  });

  it("shows an empty state, and no rubric, when the team has no submissions", async () => {
    const b = setup({ submissions: [] });
    const html = await render();
    expect(html).toContain("No submission uploaded yet.");
    expect(html).toContain("team has no submissions yet");
    expect(b.rubric_categories.select).not.toHaveBeenCalled();
    expect(scoring.renders).toBe(0);
  });

  it("treats a null submissions result as no submissions", async () => {
    setup({ submissions: null as unknown as unknown[] });
    expect(await render()).toContain("No submission uploaded yet.");
  });
});

describe("JudgeScoringPage — rubric", () => {
  it("requests the rubric for every submitted category, uppercased", async () => {
    const b = setup({ submissions: [SUB_STEM, SUB_ART] });
    await render();
    expect(b.rubric_categories.in).toHaveBeenCalledWith("rubric_type", ["STEM", "ART"]);
  });

  it("de-duplicates categories", async () => {
    const b = setup({ submissions: [SUB_STEM, { ...SUB_STEM }] });
    await render();
    expect(b.rubric_categories.in).toHaveBeenCalledWith("rubric_type", ["STEM"]);
  });

  it("prefixes criterion groups with the rubric type when several categories are scored", async () => {
    setup({ submissions: [SUB_STEM, SUB_ART] });
    await render();
    const names = scoring.props.criteria.map((c: any) => c.category_name);
    expect(names).toEqual(["ART — Presentation", "STEM — Presentation"]);
  });

  it("leaves group names unprefixed for a single category", async () => {
    setup({ submissions: [SUB_STEM], rubric: [RUBRIC[1]] });
    await render();
    expect(scoring.props.criteria.map((c: any) => c.category_name)).toEqual(["Presentation"]);
  });

  it("includes criteria from every category, passing teamId through", async () => {
    setup({ submissions: [SUB_STEM, SUB_ART] });
    await render();
    expect(scoring.props.teamId).toBe("t-1");
    expect(scoring.props.criteria.map((c: any) => c.id).sort()).toEqual(["c-art", "c-stem"]);
  });

  it("lists the categories in the rubric heading", async () => {
    setup({ submissions: [SUB_STEM, SUB_ART] });
    expect(await render()).toContain("Rubric — STEM, ART");
  });

  it("seeds existing scores and the locked flag", async () => {
    setup({
      submissions: [SUB_STEM],
      rubric: [RUBRIC[1]],
      scores: [{ criterion_id: "c-stem", score: 7, locked: true }],
    });
    await render();
    expect(scoring.props.criteria[0].initial_score).toBe(7);
    expect(scoring.props.isLocked).toBe(true);
  });

  it("scopes existing scores to this judge and team", async () => {
    const b = setup();
    await render();
    expect(b.judging_scores.eq).toHaveBeenCalledWith("team_id", "t-1");
    expect(b.judging_scores.eq).toHaveBeenCalledWith("judge_id", "judge-1");
  });
});
