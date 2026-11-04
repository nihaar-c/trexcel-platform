import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/app/dashboard/actions", () => ({
  upsertSubmission: vi.fn(),
  saveTeamOverview: vi.fn(),
}));

const { default: SubmissionsClient } = await import(
  "@/app/dashboard/submissions/SubmissionsClient"
);

const PROFILE_BANNER = "You must complete your profile, including your profile picture";
const WAIVER_BANNER = "You must complete your participant waiver";
const TEAM_BANNER = "You need to join or create a team";

function render(props: Partial<Parameters<typeof SubmissionsClient>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(SubmissionsClient, {
      team: { team_name: "Team Alpha", theme: null, memo: null },
      submissionsByCategory: {},
      ...props,
    }),
  );
}

// The Save draft / Submit buttons are only rendered when the form is editable.
const canSubmit = (html: string) => html.includes('value="submitted"');

describe("SubmissionsClient — profile gate", () => {
  it("shows no banner and an editable form when everything is complete", () => {
    const html = render({ waiverComplete: true, profileComplete: true });
    expect(html).not.toContain(PROFILE_BANNER);
    expect(html).not.toContain(WAIVER_BANNER);
    expect(canSubmit(html)).toBe(true);
  });

  it("defaults to unblocked when the props are omitted", () => {
    const html = render();
    expect(html).not.toContain(PROFILE_BANNER);
    expect(canSubmit(html)).toBe(true);
  });

  it("shows the profile banner and locks the form when the profile is incomplete", () => {
    const html = render({ waiverComplete: true, profileComplete: false });
    expect(html).toContain(PROFILE_BANNER);
    expect(html).toContain("Go to the Info tab");
    expect(canSubmit(html)).toBe(false);
    expect(html).not.toContain("Save draft");
  });

  it("disables the form fields while the profile is incomplete", () => {
    const html = render({ profileComplete: false });
    expect(html).toContain("disabled");
  });

  it("shows both banners when the waiver and the profile are both incomplete", () => {
    const html = render({ waiverComplete: false, profileComplete: false });
    expect(html).toContain(PROFILE_BANNER);
    expect(html).toContain(WAIVER_BANNER);
    expect(canSubmit(html)).toBe(false);
  });

  it("shows only the waiver banner when just the waiver is missing", () => {
    const html = render({ waiverComplete: false, profileComplete: true });
    expect(html).toContain(WAIVER_BANNER);
    expect(html).not.toContain(PROFILE_BANNER);
    expect(canSubmit(html)).toBe(false);
  });

  it("shows only the team banner (not the profile one) for a student with no team", () => {
    const html = render({ readOnly: true, profileComplete: false });
    expect(html).toContain(TEAM_BANNER);
    expect(html).not.toContain(PROFILE_BANNER);
    expect(canSubmit(html)).toBe(false);
  });
});
