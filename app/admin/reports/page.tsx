import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  GROUPABLE,
  REPORT_FIELDS,
  buildReport,
  countTeams,
  fieldByKey,
  loadReportRows,
  parseReportConfig,
} from "@/lib/reports";

const TH =
  "px-4 py-3 text-left text-xs font-medium tracking-widest text-zinc-400 uppercase dark:text-zinc-500";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const config = parseReportConfig(params);
  const presetParam = Array.isArray(params.preset) ? params.preset[0] : params.preset;
  const isPreset = presetParam === "teams";
  const hasReport = config.fields.length > 0;

  const supabase = await createClient();
  const rows = hasReport ? await loadReportRows(supabase) : [];
  const groups = hasReport ? buildReport(rows, config.groupBy) : [];
  const cols = config.fields.map(fieldByKey);
  const exportQs = new URLSearchParams();
  if (isPreset) exportQs.set("preset", "teams");
  else {
    config.fields.forEach((f) => exportQs.append("fields", f));
    if (config.groupBy) exportQs.set("groupBy", config.groupBy);
  }
  const usesSensitive = cols.some((c) => c.sensitive);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Reports</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Student rosters you can group, filter by column and export to CSV.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href="/admin/reports?preset=teams"
          className={`rounded-md px-3 py-2 text-sm font-medium ${isPreset ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900" : "border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"}`}
        >
          Team report
        </Link>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          Team Name, Student Names, Email, Phone Number, School Name
        </span>
      </div>

      <form
        method="get"
        className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Custom report</h2>
        <fieldset className="mt-3">
          <legend className="text-xs text-zinc-500 dark:text-zinc-400">Columns</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {REPORT_FIELDS.map((f) => (
              <label key={f.key} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  name="fields"
                  value={f.key}
                  defaultChecked={!isPreset && config.fields.includes(f.key)}
                />
                {f.label}
                {f.sensitive && <span className="text-xs text-amber-600 dark:text-amber-400">•</span>}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="text-amber-600 dark:text-amber-400">•</span> Personal data about
            students or parents. Check what your recipient is allowed to receive before exporting.
          </p>
        </fieldset>
        <label className="mt-4 block text-sm text-zinc-700 dark:text-zinc-300">
          Group by{" "}
          <select
            name="groupBy"
            defaultValue={isPreset ? "" : (config.groupBy ?? "")}
            className="ml-2 rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">No grouping</option>
            {GROUPABLE.map((k) => (
              <option key={k} value={k}>
                {fieldByKey(k).label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          Run report
        </button>
      </form>

      {!hasReport && (
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          Pick the Team report or choose at least one column to run a custom report.
        </p>
      )}

      {hasReport && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {rows.length} students · {countTeams(rows)} teams
              {config.groupBy && ` in ${groups.length} groups by ${fieldByKey(config.groupBy).label}`}
              {usesSensitive && " · includes personal data"}
            </p>
            <a
              href={`/admin/reports/export?${exportQs.toString()}`}
              className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Download CSV
            </a>
          </div>

          <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  {cols.map((c) => (
                    <th key={c.key} className={TH}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              {groups.map((g, i) => (
                <tbody key={g.label ?? i} className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {g.label !== null && (
                    <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                      <th
                        colSpan={cols.length}
                        className="px-4 py-2 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-50"
                      >
                        {g.label}{" "}
                        <span className="font-normal text-zinc-500">
                          · {g.rows.length} {g.rows.length === 1 ? "student" : "students"} ·{" "}
                          {countTeams(g.rows)} {countTeams(g.rows) === 1 ? "team" : "teams"}
                        </span>
                      </th>
                    </tr>
                  )}
                  {g.rows.map((r, j) => (
                    <tr key={j}>
                      {cols.map((c) => (
                        <td key={c.key} className="px-4 py-2 text-zinc-700 dark:text-zinc-300">
                          {r[c.key] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
