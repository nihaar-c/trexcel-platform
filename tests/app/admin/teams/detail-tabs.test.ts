import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Static rendering can't click tabs, so pin the tab state instead.
const state = vi.hoisted(() => ({ tab: "submission" }));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: () => [state.tab, () => {}],
}));

const { default: TeamDetailTabs } = await import(
  "@/app/admin/teams/[id]/TeamDetailTabs"
);

type Sub = Parameters<typeof TeamDetailTabs>[0]["submissions"][number];

const STEM: Sub = {
  id: "s1",
  category: "STEM",
  title: "Solar Tracker",
  description: "A tracker for panels.",
  ai_description: "Used AI for brainstorming.",
  help_received: "Teacher reviewed it.",
  file_url: "https://example.com/stem.pdf",
  submitted_at: "2026-10-20T12:00:00Z",
  status: "submitted",
};
const ART: Sub = {
  id: "s2",
  category: "ART",
  title: null,
  description: null,
  ai_description: null,
  help_received: null,
  file_url: null,
  submitted_at: "2026-10-21T12:00:00Z",
  status: null,
};

function render(submissions: Sub[]) {
  return renderToStaticMarkup(
    createElement(TeamDetailTabs, { members: [], submissions, scores: [] }),
  );
}

beforeEach(() => { state.tab = "submission"; });

describe("TeamDetailTabs — submission tab", () => {
  it("shows 'No submission yet.' when the team has none", () => {
    expect(render([])).toContain("No submission yet.");
  });

  it("renders one card per submission so multi-category teams are all visible", () => {
    const html = render([STEM, ART]);
    expect(html).toContain("STEM");
    expect(html).toContain("ART");
    expect(html).not.toContain("No submission yet.");
    expect(html.match(/Category/g)).toHaveLength(2);
  });

  it("shows title, description, AI use and help received", () => {
    const html = render([STEM]);
    expect(html).toContain("Solar Tracker");
    expect(html).toContain("A tracker for panels.");
    expect(html).toContain("Used AI for brainstorming.");
    expect(html).toContain("Teacher reviewed it.");
  });

  it("renders a dash for blank fields", () => {
    const html = render([ART]);
    // Title, Description, AI use, Help received
    expect(html.match(/>—</g)).toHaveLength(4);
  });

  it("links to the file only when file_url is set", () => {
    const html = render([STEM, ART]);
    expect(html.match(/View file/g)).toHaveLength(1);
    expect(html).toContain('href="https://example.com/stem.pdf"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("shows the status, defaulting to draft", () => {
    const html = render([STEM, ART]);
    expect(html).toContain("submitted");
    expect(html).toContain("draft");
  });
});

describe("TeamDetailTabs — other tabs", () => {
  it("does not render submissions on the members tab", () => {
    state.tab = "members";
    const html = render([STEM]);
    expect(html).not.toContain("Solar Tracker");
    expect(html).toContain("No members yet.");
  });
});
