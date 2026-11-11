import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { makeQuery } from "../../helpers/query";

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

const { default: Page } = await import("@/app/admin/page");

beforeEach(() => {
  mockFrom.mockImplementation(() => makeQuery({ data: null }));
});

describe("AdminOverviewPage", () => {
  it("does not show or query the hidden submissions feature", async () => {
    const html = renderToStaticMarkup((await Page()) as ReactElement);
    expect(html).not.toContain("Submissions");
    expect(mockFrom).not.toHaveBeenCalledWith("submissions");
  });

  it("still shows accounts, teams and judges", async () => {
    const html = renderToStaticMarkup((await Page()) as ReactElement);
    for (const label of ["Total accounts", "Teams", "Judges"]) {
      expect(html).toContain(label);
    }
  });
});
