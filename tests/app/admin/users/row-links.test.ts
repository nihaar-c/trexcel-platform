import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { makeQuery } from "../../../helpers/query";

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock("next/link", () => ({
  default: ({ children, href, className }: { children: ReactNode; href: string; className?: string }) =>
    createElement("a", { href, className }, children),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

const { default: Page } = await import("@/app/admin/users/page");

const person = (n: string) => ({
  id: n,
  email: `${n}@x.com`,
  first_name: n,
  last_name: null,
  role: "student",
  team_id: null,
  teams: null,
});

let html: string;

beforeEach(async () => {
  const people = Array.from({ length: 15 }, (_, i) => person(`u${String(i).padStart(2, "0")}`));
  const b = {
    profiles: makeQuery({ data: people }),
    waivers: makeQuery({ data: [] }),
    student_details: makeQuery({ data: [] }),
  };
  mockFrom.mockImplementation((t: keyof typeof b) => b[t]);
  html = renderToStaticMarkup((await Page()) as ReactElement);
});

describe("admin users table row links", () => {
  it("does not use a stretched ::after overlay (breaks in browsers that ignore position on <tr>)", () => {
    expect(html).not.toContain("after:absolute");
    expect(html).not.toContain("after:inset");
  });

  it("does not rely on <tr> being a positioned containing block", () => {
    const rows = html.split("<tr").slice(2);
    expect(rows).toHaveLength(15);
    for (const tr of rows) {
      const open = tr.slice(0, tr.indexOf(">"));
      expect(open).not.toMatch(/\brelative\b/);
    }
  });

  it("makes every cell of every row a link to that user's page", () => {
    const rows = html.split("<tr").slice(2);
    rows.forEach((tr, i) => {
      const id = `u${String(i).padStart(2, "0")}`;
      const links = tr.match(new RegExp(`<a href="/admin/users/${id}"`, "g")) ?? [];
      expect(links).toHaveLength(6);
    });
  });
});
