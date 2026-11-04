import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { makeQuery } from "../../helpers/query";

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock("next/link", () => ({ default: ({ children, href }: any) => `<a href="${href}">${children}</a>` }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

const { default: Page } = await import("@/app/admin/reports/page");

const student = (id: string, last: string, team: string | null) => ({
  id,
  email: `${id}@x.com`,
  first_name: id,
  last_name: last,
  phone: null,
  role: "student",
  teams: team ? { team_name: team, invite_code: "C" } : null,
});

beforeEach(() => {
  const t = {
    profiles: makeQuery({
      data: [
        student("a", "A", "Rex"),
        student("b", "B", "Rex"),
        student("c", "C", "Nova"),
        student("d", "D", "Solo"),
        student("e", "E", null),
      ],
    }),
    student_details: makeQuery({
      data: [
        { user_id: "a", school_name: "Hill High School" },
        { user_id: "b", school_name: "hill high school" },
        { user_id: "c", school_name: "Hill" },
        { user_id: "d", school_name: "Lick" },
      ],
    }),
    waivers: makeQuery({ data: [] }),
  } as Record<string, unknown>;
  mockFrom.mockImplementation((n: string) => t[n]);
});

const render = async (params: Record<string, string | string[]>) =>
  renderToStaticMarkup((await Page({ searchParams: Promise.resolve(params) })) as any);

describe("AdminReportsPage", () => {
  it("shows a prompt and runs no queries before a report is chosen", async () => {
    const html = await render({});
    expect(html).toContain("Pick the Team report");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("team preset: fixed columns, summary line, download link", async () => {
    const html = await render({ preset: "teams" });
    for (const h of ["Team Name", "Student Name", "Email", "Phone Number", "School Name"]) {
      expect(html).toContain(`>${h}</th>`);
    }
    expect(html).toContain("5 students · 3 teams");
    expect(html).toContain('href="/admin/reports/export?preset=teams"');
  });

  it("grouped by school: headers show student and team counts with singular/plural", async () => {
    const html = await render({ fields: ["team_name", "email"], groupBy: "school_name" });
    expect(html).toContain("in 3 groups by School Name");
    // Hill: a + b (team Rex) + c (team Nova) => 3 students, 2 teams
    expect(html).toContain("Hill High School");
    expect(html).toMatch(/3 students\s*·\s*2 teams/);
    // Lick: 1 student, 1 team
    expect(html).toMatch(/1 student\s*·\s*1 team(?!s)/);
    // e has no school and no team
    expect(html).toContain("(none)");
    expect(html).toMatch(/1 student\s*·\s*0 teams/);
  });

  it("export link carries the chosen fields and groupBy", async () => {
    const html = await render({ fields: ["email", "phone"], groupBy: "school_name" });
    expect(html).toContain("fields=email&amp;fields=phone&amp;groupBy=school_name");
  });

  it("flags personal-data columns and ignores unknown params", async () => {
    const html = await render({ fields: ["email", "parent_email", "bogus"], groupBy: "email" });
    expect(html).toContain("includes personal data");
    expect(html).not.toContain("bogus");
    expect(html).not.toContain("groups by"); // invalid groupBy dropped
    expect(await render({ fields: ["email"] })).not.toContain("includes personal data");
  });

  it("with the team preset, no custom checkbox is pre-checked", async () => {
    expect(await render({ preset: "teams" })).not.toContain("checked");
  });
});
