import { describe, expect, it } from "vitest";
import {
  countTeams,
  REPORT_FIELDS,
  buildReport,
  parseReportConfig,
  toCsv,
  TEAM_REPORT_FIELDS,
  type ReportRow,
} from "@/lib/reports";

const r = (o: Partial<ReportRow>): ReportRow => ({
  team_name: "",
  first_name: "",
  last_name: "",
  school_name: "",
  ...o,
});

describe("parseReportConfig", () => {
  it("teams preset uses the fixed columns", () => {
    expect(parseReportConfig({ preset: "teams" })).toEqual({
      fields: TEAM_REPORT_FIELDS,
      groupBy: null,
    });
  });
  it("drops unknown fields, keeps catalogue order, rejects bad groupBy", () => {
    const c = parseReportConfig({ fields: ["email", "bogus", "team_name"], groupBy: "email" });
    expect(c).toEqual({ fields: ["team_name", "email"], groupBy: null });
    expect(REPORT_FIELDS.length).toBeGreaterThan(5);
  });
  it("accepts a single string value", () => {
    expect(parseReportConfig({ fields: "email", groupBy: "school_name" })).toEqual({
      fields: ["email"],
      groupBy: "school_name",
    });
  });
});

describe("buildReport", () => {
  const rows = [
    r({ team_name: "B", school_name: "X", last_name: "Z", first_name: "A" }),
    r({ team_name: "A", school_name: "", last_name: "Y", first_name: "A" }),
    r({ team_name: "A", school_name: "X", last_name: "B", first_name: "A" }),
  ];
  it("groups by value, blanks last and labelled", () => {
    const g = buildReport(rows, "school_name");
    expect(g.map((x) => [x.label, x.rows.length])).toEqual([["X", 2], ["(none)", 1]]);
  });
  it("without groupBy returns one group sorted by team", () => {
    const g = buildReport(rows, null);
    expect(g).toHaveLength(1);
    expect(g[0].rows.map((x) => x.team_name)).toEqual(["A", "A", "B"]);
  });
});

describe("toCsv", () => {
  it("adds a Group column, quotes, and neutralises formulas", () => {
    const groups = buildReport([r({ school_name: "X", first_name: '=HYP("a",b)' })], "school_name");
    const csv = toCsv(groups, { fields: ["first_name"], groupBy: "school_name" });
    expect(csv).toBe(`﻿School Name,First Name\r\nX,"'=HYP(""a"",b)"\r\n`);
  });
});

import { vi } from "vitest";
import { GROUPABLE, loadReportRows, normalizeSchools, schoolKey } from "@/lib/reports";
import { makeQuery } from "../helpers/query";

describe("field catalogue", () => {
  it("does not offer city or state", () => {
    const keys = REPORT_FIELDS.map((f) => f.key);
    expect(keys).not.toContain("city");
    expect(keys).not.toContain("state");
    expect(GROUPABLE).not.toContain("city");
    expect(parseReportConfig({ fields: ["city", "state"] }).fields).toEqual([]);
  });
});

describe("loadReportRows", () => {
  const supa = (profiles: unknown[], details: unknown[], waivers: unknown[]) => {
    const t: Record<string, unknown> = {
      profiles: makeQuery({ data: profiles }),
      student_details: makeQuery({ data: details }),
      waivers: makeQuery({ data: waivers }),
    };
    return { from: vi.fn((n: string) => t[n]) } as any;
  };
  const team = { team_name: "Rex", invite_code: "ABC123" };

  it("merges details over profile, falls back, and skips non-students", async () => {
    const rows = await loadReportRows(
      supa(
        [
          { id: "1", email: "a@x.com", first_name: "Old", last_name: "Name", phone: "111", role: "student", teams: team },
          { id: "2", email: "b@x.com", first_name: "Bo", last_name: null, phone: "222", role: null, teams: team },
          { id: "3", email: "j@x.com", first_name: "Judy", last_name: "J", phone: null, role: "judge", teams: null },
          { id: "4", email: "m@x.com", first_name: "Mia", last_name: "M", phone: null, role: "mentor", teams: team },
        ],
        [{ user_id: "1", first_name: "New", last_name: "Name", phone: "999", school_name: "Lincoln", parent_first_name: "P", parent_last_name: "Q" }],
        [{ user_id: "1" }],
      ),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      student_name: "New Name",
      phone: "999",
      school_name: "Lincoln",
      team_name: "Rex",
      team_size: "2",
      invite_code: "ABC123",
      waiver: "Yes",
      parent_name: "P Q",
    });
    expect(rows[1]).toMatchObject({ student_name: "Bo", phone: "222", school_name: "", waiver: "No" });
  });

  it("keys team size and team count by team id, not name", async () => {
    const mk = (id: string, team_id: string) => ({
      id, email: `${id}@x.com`, first_name: id, last_name: "Z", phone: null, role: "student", team_id, teams: team,
    });
    const rows = await loadReportRows(supa([mk("1", "t1"), mk("2", "t1"), mk("3", "t2")], [], []));
    expect(rows.map((r) => r.team_size)).toEqual(["2", "2", "1"]);
    expect(countTeams(rows)).toBe(2);
  });

  it("handles students with no team", async () => {
    const [row] = await loadReportRows(
      supa([{ id: "1", email: "a@x.com", first_name: "A", last_name: "B", phone: null, role: "student", teams: null }], [], []),
    );
    expect(row).toMatchObject({ team_name: "", team_size: "", invite_code: "" });
  });
});

describe("school name normalization", () => {
  it("schoolKey ignores case, punctuation, spacing and a High School/HS suffix", () => {
    const keys = [
      "Andrew P Hill High School",
      "Andrew P. Hill",
      "andrew p. hill  HS",
      "ANDREW P. HILL HIGH SCHOOL",
    ].map(schoolKey);
    expect(new Set(keys)).toEqual(new Set(["andrew p hill"]));
    expect(schoolKey("Lincoln High")).not.toBe(schoolKey("Lincoln"));
    expect(schoolKey("High School")).toBe("high school");
  });

  it("maps every spelling to the most common one", () => {
    const rows = [
      "Andrew P. Hill High School",
      "Andrew P. Hill High School",
      "Andrew P. Hill High School",
      "Andrew P Hill High School",
      "Andrew P. Hill",
      "",
      "Yerba Buena",
      "yerba Buena High School",
    ].map((school_name) => r({ school_name }));
    const out = normalizeSchools(rows).map((x) => x.school_name);
    expect(out.slice(0, 5)).toEqual(Array(5).fill("Andrew P. Hill High School"));
    expect(out[5]).toBe("");
    // tie: the one starting with a capital wins
    expect(out.slice(6)).toEqual(["Yerba Buena", "Yerba Buena"]);
  });

  it("makes grouping collapse the variants into one group", () => {
    const rows = normalizeSchools([
      r({ school_name: "James Lick High school", team_name: "A" }),
      r({ school_name: "James Lick High School", team_name: "B" }),
    ]);
    expect(buildReport(rows, "school_name").map((g) => [g.label, g.rows.length])).toEqual([
      ["James Lick High School", 2],
    ]);
  });
});

describe("countTeams", () => {
  it("counts distinct non-empty teams", () => {
    expect(countTeams([r({ team_name: "A" }), r({ team_name: "A" }), r({ team_name: "B" }), r({})])).toBe(2);
    expect(countTeams([])).toBe(0);
  });
});

describe("edge cases", () => {
  it("toCsv without grouping has no Group column and quotes commas/newlines/quotes", () => {
    const groups = buildReport(
      [r({ first_name: "A, B", last_name: 'He said "hi"', school_name: "line1\\nline2".replace("\\n", "\n") })],
      null,
    );
    const csv = toCsv(groups, { fields: ["first_name", "last_name", "school_name"], groupBy: null });
    expect(csv).toBe('﻿First Name,Last Name,School Name\r\n"A, B","He said ""hi""","line1\nline2"\r\n');
  });

  it("toCsv with no rows still writes the header", () => {
    expect(toCsv(buildReport([], null), { fields: ["email"], groupBy: null })).toBe("﻿Email\r\n");
  });

  it("neutralises every formula trigger character", () => {
    for (const c of ["=", "+", "-", "@"]) {
      const g = buildReport([r({ first_name: `${c}x` })], null);
      expect(toCsv(g, { fields: ["first_name"], groupBy: null })).toContain(`'${c}x`);
    }
  });

  it("sorts members of a group by last then first name", () => {
    const g = buildReport(
      [
        r({ school_name: "S", last_name: "Lee", first_name: "Zed" }),
        r({ school_name: "S", last_name: "Lee", first_name: "Amy" }),
        r({ school_name: "S", last_name: "Adams", first_name: "Bo" }),
      ],
      "school_name",
    );
    expect(g[0].rows.map((x) => `${x.first_name} ${x.last_name}`)).toEqual(["Bo Adams", "Amy Lee", "Zed Lee"]);
  });

  it("groups by waiver and ignores a repeated groupBy param", () => {
    expect(parseReportConfig({ fields: ["email"], groupBy: ["waiver", "school_name"] }).groupBy).toBe("waiver");
  });

  it("normalizeSchools does not mutate its input and handles empty input", () => {
    const input = [r({ school_name: "a high school" }), r({ school_name: "A High School" })];
    const before = JSON.stringify(input);
    normalizeSchools(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(normalizeSchools([])).toEqual([]);
  });
});
