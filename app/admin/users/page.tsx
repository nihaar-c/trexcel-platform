import { createClient } from "@/lib/supabase/server";

const ROLE_STYLES: Record<string, string> = {
  admin:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  judge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  mentor:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  student: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, role, team_id, teams(team_name)")
    .order("email");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Users
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {profiles?.length ?? 0} accounts
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="px-4 py-3 text-left text-xs font-medium tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                Team
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {profiles?.map((p) => {
              const role = p.role ?? "student";
              const team = p.teams as { team_name: string } | null;
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    {p.first_name || p.last_name
                      ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {p.email ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ROLE_STYLES[role] ?? ROLE_STYLES.student}`}
                    >
                      {role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {team?.team_name ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
