import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const STATUS_STYLES: Record<string, string> = {
  submitted:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  reviewed:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  draft: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

export default async function AdminTeamsPage() {
  const supabase = await createClient();

  const { data: teams } = await supabase
    .from("teams")
    .select(
      `id, team_name, count,
       members:profiles(id, role),
       submission:submissions(category, status, submitted_at)`,
    )
    .order("team_name");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Teams
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {teams?.length ?? 0} teams
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams?.map((team) => {
          const members = (team.members ?? []) as { id: string; role: string | null }[];
          const students = members.filter(
            (m) => !m.role || m.role === "student",
          ).length;
          const hasMentor = members.some((m) => m.role === "mentor");
          const sub = Array.isArray(team.submission)
            ? team.submission[0]
            : team.submission;
          const status: string = sub?.status ?? "draft";

          return (
            <Link
              key={team.id}
              href={`/admin/teams/${team.id}`}
              className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {team.team_name}
                </h2>
                <span
                  className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}
                >
                  {status}
                </span>
              </div>

              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {sub?.category ?? "No category"}
              </p>

              <div className="mt-4 flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
                <span>{students} student{students !== 1 ? "s" : ""}</span>
                {hasMentor && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    mentor
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
