import { createClient } from "@/lib/supabase/server";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [
    { count: userCount },
    { count: teamCount },
    { count: submissionCount },
    { count: judgeCount },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("teams").select("*", { count: "exact", head: true }),
    supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "submitted"),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "judge"),
  ]);

  const stats = [
    { label: "Total accounts", value: userCount ?? 0 },
    { label: "Teams", value: teamCount ?? 0 },
    { label: "Submissions", value: submissionCount ?? 0 },
    { label: "Judges", value: judgeCount ?? 0 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Overview
      </h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {value}
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
