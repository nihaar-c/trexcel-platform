import { createClient } from "@/lib/supabase/server";

const ROLE_STYLES: Record<string, string> = {
  admin:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  judge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  mentor:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  student: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

function Check({ done }: { done: boolean }) {
  if (done) {
    return (
      <svg
        className="h-4 w-4 text-green-500"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <svg
      className="h-4 w-4 text-zinc-300 dark:text-zinc-600"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const [{ data }, { data: waivers }, { data: details }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, first_name, last_name, role, team_id, teams(team_name)")
      .order("email"),
    supabase
      .from("waivers")
      .select("user_id")
      .not("completed_at", "is", null),
    supabase
      .from("student_details")
      .select("user_id")
      .not("first_name", "is", null),
  ]);

  const waiverDone = new Set((waivers ?? []).map((w) => w.user_id));
  const profileDone = new Set((details ?? []).map((d) => d.user_id));

  const profiles = data
    ?.slice()
    .sort((a, b) => {
      const teamA = (a.teams as { team_name: string } | null)?.team_name ?? "";
      const teamB = (b.teams as { team_name: string } | null)?.team_name ?? "";
      if (teamA !== teamB) {
        if (!teamA) return 1;
        if (!teamB) return -1;
        return teamA.localeCompare(teamB);
      }
      return (a.email ?? "").localeCompare(b.email ?? "");
    });

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
              <th className="px-4 py-3 text-center text-xs font-medium tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                Profile
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                Waiver
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
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <Check done={profileDone.has(p.id)} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <Check done={waiverDone.has(p.id)} />
                    </div>
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
