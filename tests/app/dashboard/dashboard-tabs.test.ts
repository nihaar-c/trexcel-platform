import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/app/dashboard/actions", () => ({
  saveMentorRequest: vi.fn(),
  confirmCheckpoint: vi.fn(),
}));
vi.mock("@/app/dashboard/TeamSetup", () => ({ default: () => null }));
vi.mock("@/app/dashboard/ProfileForm", () => ({ default: () => null }));
vi.mock("@/app/dashboard/CompetitionOverview", () => ({ default: () => null }));
vi.mock("@/app/dashboard/WaiverTab", () => ({ default: () => null }));
vi.mock("@/app/dashboard/HelpTab", () => ({ default: () => null }));
vi.mock("@/app/dashboard/CheckpointTab", () => ({ default: () => null }));

const { default: DashboardTabs } = await import("@/app/dashboard/DashboardTabs");

const base = {
  email: "s@x.com",
  userId: "u-1",
  team: null,
  studentDetails: null,
  waiver: null,
  checkpointsDone: [] as number[],
  profileComplete: true,
  waiverComplete: true,
};

const render = (role: string | null) =>
  renderToStaticMarkup(
    createElement(DashboardTabs, {
      ...base,
      profile: { role, team_id: null },
    }),
  );

describe("DashboardTabs", () => {
  it("shows Checkpoint 1 and Checkpoint 2 tabs for students", () => {
    const html = render("student");
    expect(html).toContain("Checkpoint 1");
    expect(html).toContain("Checkpoint 2");
  });

  it("no longer links to the submissions page", () => {
    const html = render("student");
    expect(html).not.toContain("/dashboard/submissions");
    expect(html).not.toContain(">Submissions<");
  });

  it("treats a missing role as a student", () => {
    expect(render(null)).toContain("Checkpoint 1");
  });

  it("does not show checkpoint tabs to mentors", () => {
    const html = render("mentor");
    expect(html).not.toContain("Checkpoint 1");
    expect(html).not.toContain("Checkpoint 2");
  });
});
