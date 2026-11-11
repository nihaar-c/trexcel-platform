import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CHECKPOINT_FORMS } from "@/lib/checkpoints";

vi.mock("@/app/dashboard/actions", () => ({ confirmCheckpoint: vi.fn() }));

const { default: CheckpointTab } = await import("@/app/dashboard/CheckpointTab");

const render = (props: {
  checkpoint: 1 | 2;
  hasTeam: boolean;
  confirmed: boolean;
  profileComplete?: boolean;
  waiverComplete?: boolean;
}) =>
  renderToStaticMarkup(
    createElement(CheckpointTab, {
      profileComplete: true,
      waiverComplete: true,
      onNavigate: () => {},
      ...props,
    }),
  );

describe("CheckpointTab", () => {
  it.each([1, 2] as const)("embeds the Google Form for checkpoint %i", (n) => {
    const html = render({ checkpoint: n, hasTeam: true, confirmed: false });
    expect(html).toContain("<iframe");
    expect(html).toContain(`${CHECKPOINT_FORMS[n]}?embedded=true`);
    expect(html).toContain(`Checkpoint ${n}`);
  });

  it("offers a new-tab fallback link to the plain form URL", () => {
    const html = render({ checkpoint: 1, hasTeam: true, confirmed: false });
    expect(html).toContain(`href="${CHECKPOINT_FORMS[1]}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain("noopener");
  });

  it("shows the confirm button when not yet confirmed", () => {
    const html = render({ checkpoint: 2, hasTeam: true, confirmed: false });
    expect(html).toContain("I&#x27;ve submitted Checkpoint 2");
    expect(html).not.toContain("marked Checkpoint 2 as submitted");
  });

  it("shows the confirmed banner instead of the button when already confirmed", () => {
    const html = render({ checkpoint: 2, hasTeam: true, confirmed: true });
    expect(html).toContain("marked Checkpoint 2 as submitted");
    expect(html).not.toContain("I&#x27;ve submitted");
  });

  it("disables confirmation and prompts to join a team when the user has none", () => {
    const html = render({ checkpoint: 1, hasTeam: false, confirmed: false });
    expect(html).toContain("Join or create a team first");
    expect(html).toMatch(/<button[^>]*disabled/);
  });

  describe("profile + waiver gate", () => {
    it("hides the form, fallback link and confirm button when the profile is incomplete", () => {
      const html = render({ checkpoint: 1, hasTeam: true, confirmed: false, profileComplete: false });
      expect(html).toContain("profile picture");
      expect(html).toContain("Go to Info");
      expect(html).not.toContain("<iframe");
      expect(html).not.toContain(CHECKPOINT_FORMS[1]);
      expect(html).not.toContain("I&#x27;ve submitted");
    });

    it("gates checkpoint 2 as well", () => {
      const html = render({ checkpoint: 2, hasTeam: true, confirmed: false, profileComplete: false });
      expect(html).toContain("Checkpoint 2");
      expect(html).not.toContain("<iframe");
    });

    it("still shows the confirmed banner if already confirmed", () => {
      const html = render({ checkpoint: 1, hasTeam: true, confirmed: true, profileComplete: false });
      expect(html).toContain("marked Checkpoint 1 as submitted");
    });

    it("gates on an incomplete waiver even when the profile is complete", () => {
      const html = render({ checkpoint: 1, hasTeam: true, confirmed: false, waiverComplete: false });
      expect(html).toContain("Complete your waiver");
      expect(html).toContain("Go to Waivers");
      expect(html).not.toContain("Go to Info");
      expect(html).not.toContain("<iframe");
    });

    it("lists both requirements when both are missing", () => {
      const html = render({
        checkpoint: 2, hasTeam: true, confirmed: false,
        profileComplete: false, waiverComplete: false,
      });
      expect(html).toContain("Go to Info");
      expect(html).toContain("Go to Waivers");
    });

    it("shows the form once the profile is complete", () => {
      const html = render({ checkpoint: 1, hasTeam: true, confirmed: false, profileComplete: true });
      expect(html).toContain("<iframe");
      expect(html).not.toContain("Go to Info");
    });
  });
});
