import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/app/admin/teams/actions", () => ({ setCheckpoint: vi.fn() }));

const { default: CheckpointToggles } = await import("@/app/admin/teams/CheckpointToggles");

function html(initial: number[]) {
  return renderToStaticMarkup(
    createElement(CheckpointToggles, { teamId: "t-1", checkpoints: [1, 2, 3, 4], initial }),
  );
}

describe("CheckpointToggles", () => {
  it("renders a labelled checkbox per checkpoint", () => {
    const out = html([]);
    for (const n of [1, 2, 3, 4]) expect(out).toContain(`Checkpoint ${n}`);
    expect(out.match(/type="checkbox"/g)).toHaveLength(4);
  });

  it("pre-checks the completed checkpoints only", () => {
    const out = html([1, 3]);
    expect(out.match(/checked=""/g)).toHaveLength(2);
  });
});
