import { createClient } from "@/lib/supabase/server";

type RequesterRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  mentor_request_memo: string | null;
  team_id: string | null;
  teams: { team_name: string } | null;
};

export default async function AdminMentorRequestsPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, email, first_name, last_name, mentor_request_memo, team_id, teams(team_name)",
    )
    .not("mentor_request_memo" as never, "is", null)
    .neq("mentor_request_memo" as never, "");

  const requests = (data ?? []) as unknown as RequesterRow[];

  // Group requests by team, teams sorted alphabetically, unassigned last.
  const groups = new Map<
    string,
    { teamName: string | null; rows: RequesterRow[] }
  >();
  for (const r of requests) {
    const key = r.team_id ?? "__none__";
    const teamName = r.teams?.team_name ?? null;
    const group = groups.get(key) ?? { teamName, rows: [] };
    group.rows.push(r);
    groups.set(key, group);
  }

  const orderedGroups = [...groups.values()].sort((a, b) => {
    if (!a.teamName) return 1;
    if (!b.teamName) return -1;
    return a.teamName.localeCompare(b.teamName);
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Mentor Requests
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {requests.length} request{requests.length !== 1 ? "s" : ""}
      </p>

      {orderedGroups.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          No mentor requests yet.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {orderedGroups.map((group, i) => (
            <div
              key={group.teamName ?? `unassigned-${i}`}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {group.teamName ?? "No team"}
                </h2>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {group.rows.length} request
                  {group.rows.length !== 1 ? "s" : ""}
                </span>
              </div>
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {group.rows.map((r) => {
                  const name =
                    r.first_name || r.last_name
                      ? `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim()
                      : (r.email ?? "—");
                  return (
                    <li key={r.id} className="px-5 py-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {name}
                        </p>
                        {r.email && (
                          <p className="text-xs text-zinc-400 dark:text-zinc-500">
                            {r.email}
                          </p>
                        )}
                      </div>
                      <p className="mt-2 text-sm whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
                        {r.mentor_request_memo}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
