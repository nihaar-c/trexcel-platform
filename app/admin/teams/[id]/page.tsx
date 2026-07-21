import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import TeamDetailTabs from "./TeamDetailTabs";

export default async function AdminTeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [teamResult, membersResult, submissionResult, scoresResult] =
    await Promise.all([
      supabase
        .from("teams")
        .select("id, team_name, count")
        .eq("id", id)
        .single(),
      supabase
        .from("profiles")
        .select("id, email, first_name, last_name, role, team_id")
        .eq("team_id", id),
      supabase
        .from("submissions")
        .select("id, description, file_url, submitted_at, category, status")
        .eq("team_id", id)
        .maybeSingle(),
      supabase
        .from("judging_scores")
        .select(
          `score,
           criterion:rubric_criteria(name, max_score, category:rubric_categories(name)),
           judge:profiles(email)`,
        )
        .eq("team_id", id),
    ]);

  if (teamResult.error || !teamResult.data) notFound();

  const team = teamResult.data;

  const memberDetails = await Promise.all(
    (membersResult.data ?? []).map(async (m) => {
      const { data: details } = await supabase
        .from("student_details")
        .select("school_name, avatar_url")
        .eq("user_id", m.id)
        .maybeSingle();
      return {
        ...m,
        school_name: details?.school_name ?? null,
        avatar_url: details?.avatar_url ?? null,
      };
    }),
  );

  const scores = (scoresResult.data ?? []).map((s: any) => ({
    criterion_name: s.criterion?.name ?? "—",
    category_name: s.criterion?.category?.name ?? "—",
    judge_email: s.judge?.email ?? null,
    score: s.score,
    max_score: s.criterion?.max_score ?? 10,
  }));

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          href="/admin/teams"
          className="hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          Teams
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-50">{team.team_name}</span>
      </div>

      <div className="mb-6 flex items-baseline gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {team.team_name}
        </h1>
        <span className="text-sm text-zinc-400 dark:text-zinc-500">
          {team.count ?? 0} member{team.count !== 1 ? "s" : ""}
        </span>
      </div>

      <TeamDetailTabs
        members={memberDetails}
        submission={submissionResult.data}
        scores={scores}
      />
    </div>
  );
}
