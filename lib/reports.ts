import type { SupabaseClient } from "@supabase/supabase-js";

/** One row per student, with everything a report can draw from. */
export type ReportRow = Record<string, string>;

export type ReportField = {
  key: string;
  label: string;
  /** Personal data about minors/parents — flagged in the UI before sharing externally. */
  sensitive?: boolean;
};

export const REPORT_FIELDS: ReportField[] = [
  { key: "team_name", label: "Team Name" },
  { key: "student_name", label: "Student Name" },
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone Number" },
  { key: "school_name", label: "School Name" },
  { key: "student_id", label: "Student ID" },
  { key: "team_size", label: "Team Size" },
  { key: "invite_code", label: "Team Invite Code" },
  { key: "waiver", label: "Waiver Completed" },
  { key: "gender", label: "Gender", sensitive: true },
  { key: "race", label: "Race", sensitive: true },
  { key: "address", label: "Address", sensitive: true },
  { key: "zip_code", label: "Zip Code", sensitive: true },
  { key: "parent_name", label: "Parent Name", sensitive: true },
  { key: "parent_email", label: "Parent Email", sensitive: true },
  { key: "parent_phone", label: "Parent Phone", sensitive: true },
];

const FIELD_KEYS = new Set(REPORT_FIELDS.map((f) => f.key));
export const fieldByKey = (key: string) => REPORT_FIELDS.find((f) => f.key === key)!;

/** Fields that make sense as a "group by". */
export const GROUPABLE = [
  "team_name",
  "school_name",
  "gender",
  "race",
  "waiver",
];

export const TEAM_REPORT_FIELDS = [
  "team_name",
  "student_name",
  "email",
  "phone",
  "school_name",
];

export type ReportConfig = {
  fields: string[];
  groupBy: string | null;
};

type Params = Record<string, string | string[] | undefined>;

const list = (v: string | string[] | undefined) =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

/** Turn URL params into a validated config. Unknown keys are dropped. */
export function parseReportConfig(params: Params): ReportConfig {
  if (list(params.preset)[0] === "teams") {
    return { fields: TEAM_REPORT_FIELDS, groupBy: null };
  }
  const requested = list(params.fields);
  // Keep catalogue order so columns are stable regardless of click order.
  const fields = REPORT_FIELDS.filter((f) => requested.includes(f.key)).map((f) => f.key);
  const g = list(params.groupBy)[0];
  const groupBy = g && GROUPABLE.includes(g) && FIELD_KEYS.has(g) ? g : null;
  return { fields, groupBy };
}

const clean = (v: string | null | undefined) => (v ?? "").trim();

type ProfileRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: string | null;
  team_id: string | null;
  teams: { team_name: string | null; invite_code: string | null } | null;
};
type DetailRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  school_name: string | null;
  student_id: string | null;
  gender: string | null;
  race: string | null;
  address: string | null;
  zip_code: string | null;
  parent_first_name: string | null;
  parent_last_name: string | null;
  parent_email: string | null;
  parent_phone: string | null;
};

/** Comparison key for free-text school names: case, punctuation, spacing and a trailing "High School"/"HS" are ignored. */
export function schoolKey(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const stripped = base.replace(/\s(high school|hs)$/, "").trim();
  return stripped || base;
}

/**
 * Students type school names by hand, so one school arrives in many spellings.
 * Rewrites school_name so every spelling of a school becomes its most common one
 * (ties: starts with a capital, then more capitals, then alphabetical). Blank names are left alone.
 */
export function normalizeSchools(rows: ReportRow[]): ReportRow[] {
  const variants = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (!r.school_name) continue;
    const k = schoolKey(r.school_name);
    const m = variants.get(k) ?? new Map<string, number>();
    m.set(r.school_name, (m.get(r.school_name) ?? 0) + 1);
    variants.set(k, m);
  }
  const upper = (v: string) => (/^[A-Z]/.test(v) ? 1 : 0);
  const caps = (v: string) => (v.match(/[A-Z]/g) ?? []).length;
  const canonical = new Map<string, string>();
  for (const [k, m] of variants) {
    const best = [...m.entries()].sort(
      (a, b) => b[1] - a[1] || upper(b[0]) - upper(a[0]) || caps(b[0]) - caps(a[0]) || a[0].localeCompare(b[0]),
    )[0][0];
    canonical.set(k, best);
  }
  return rows.map((r) =>
    r.school_name ? { ...r, school_name: canonical.get(schoolKey(r.school_name))! } : r,
  );
}

/** Teams are identified by id; team names aren't guaranteed unique. */
const teamKey = (p: ProfileRow) => p.team_id ?? clean(p.teams?.team_name);

/** Loads one row per student. Runs under the caller's RLS (admin policies). */
export async function loadReportRows(supabase: SupabaseClient): Promise<ReportRow[]> {
  const [
    { data: profiles, error: profilesError },
    { data: details, error: detailsError },
    { data: waivers, error: waiversError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, first_name, last_name, phone, role, team_id, teams(team_name, invite_code)"),
    supabase
      .from("student_details")
      .select(
        "user_id, first_name, last_name, phone, school_name, student_id, gender, race, address, zip_code, parent_first_name, parent_last_name, parent_email, parent_phone",
      ),
    supabase.from("waivers").select("user_id").not("completed_at", "is", null),
  ]);

  // A failed query must not look like "no data" (e.g. every waiver showing "No").
  const failed = profilesError ?? detailsError ?? waiversError;
  if (failed) throw new Error(`Failed to load report data: ${failed.message}`);

  const detailById = new Map((details as DetailRow[] | null ?? []).map((d) => [d.user_id, d]));
  const waiverDone = new Set((waivers ?? []).map((w: { user_id: string }) => w.user_id));

  // A missing role counts as student (same rule as the admin Teams page).
  const students = ((profiles as unknown as ProfileRow[] | null) ?? []).filter(
    (p) => !p.role || p.role === "student",
  );
  const sizeByTeam = new Map<string, number>();
  for (const p of students) {
    const t = teamKey(p);
    if (t) sizeByTeam.set(t, (sizeByTeam.get(t) ?? 0) + 1);
  }

  const rows = students.map((p) => {
    const d = detailById.get(p.id);
    // student_details is what the student typed into the Info form; profiles is the fallback.
    const first = clean(d?.first_name) || clean(p.first_name);
    const last = clean(d?.last_name) || clean(p.last_name);
    const team = clean(p.teams?.team_name);
    return {
      team_id: teamKey(p),
      team_name: team,
      student_name: `${first} ${last}`.trim(),
      first_name: first,
      last_name: last,
      email: clean(p.email),
      phone: clean(d?.phone) || clean(p.phone),
      school_name: clean(d?.school_name),
      student_id: clean(d?.student_id),
      team_size: team ? String(sizeByTeam.get(teamKey(p)) ?? 0) : "",
      invite_code: clean(p.teams?.invite_code),
      waiver: waiverDone.has(p.id) ? "Yes" : "No",
      gender: clean(d?.gender),
      race: clean(d?.race),
      address: clean(d?.address),
      zip_code: clean(d?.zip_code),
      parent_name: `${clean(d?.parent_first_name)} ${clean(d?.parent_last_name)}`.trim(),
      parent_email: clean(d?.parent_email),
      parent_phone: clean(d?.parent_phone),
    };
  });
  return normalizeSchools(rows);
}

export type ReportGroup = { label: string | null; rows: ReportRow[] };

/** Distinct teams among a group's rows (students without a team aren't counted). */
export function countTeams(rows: ReportRow[]): number {
  return new Set(rows.filter((r) => r.team_name).map((r) => r.team_id || r.team_name)).size;
}

export const NO_VALUE = "(none)";

const byName = (a: ReportRow, b: ReportRow) =>
  (a.last_name ?? "").localeCompare(b.last_name ?? "") ||
  (a.first_name ?? "").localeCompare(b.first_name ?? "");

/**
 * Sorts and (optionally) groups rows. With no groupBy, rows are sorted by team
 * then name and returned as a single unlabeled group. Blank group values sort last.
 */
export function buildReport(rows: ReportRow[], groupBy: string | null): ReportGroup[] {
  const key = groupBy ?? "team_name";
  const sorted = rows.slice().sort((a, b) => {
    const av = a[key] ?? "";
    const bv = b[key] ?? "";
    if (av !== bv) {
      if (!av) return 1;
      if (!bv) return -1;
      return av.localeCompare(bv);
    }
    return byName(a, b);
  });
  if (!groupBy) return [{ label: null, rows: sorted }];

  const groups: ReportGroup[] = [];
  for (const r of sorted) {
    const label = r[groupBy] || NO_VALUE;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(r);
    else groups.push({ label, rows: [r] });
  }
  return groups;
}

const PHONE_KEYS = new Set(["phone", "parent_phone"]);
/** A real phone number: optional leading +, then only digits and separators — no formula can hide in that. */
const PHONE_LIKE = /^\+?[\d(][\d\s().-]*$/;

function csvCell(v: string, key?: string): string {
  // Neutralise spreadsheet formula injection (=, +, -, @ at start) on user-typed text,
  // but leave genuine phone numbers (e.g. "+1 555 123 4567") untouched.
  const isPhone = key !== undefined && PHONE_KEYS.has(key) && PHONE_LIKE.test(v);
  const safe = !isPhone && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** CSV with a leading Group column when grouped. BOM so Excel reads UTF-8 correctly. */
export function toCsv(groups: ReportGroup[], config: ReportConfig): string {
  const cols = config.fields.map(fieldByKey);
  const grouped = config.groupBy !== null;
  const header = [
    ...(grouped ? [fieldByKey(config.groupBy!).label] : []),
    ...cols.map((c) => c.label),
  ];
  const lines = [header.map((h) => csvCell(h)).join(",")];
  for (const g of groups) {
    for (const r of g.rows) {
      const cells = cols.map((c) => csvCell(r[c.key] ?? "", c.key));
      const groupCell = grouped ? [csvCell(g.label ?? "")] : [];
      lines.push([...groupCell, ...cells].join(","));
    }
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}
