import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import JudgeTabs from "./JudgeTabs";

export default async function JudgePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [assignmentsResult, rubricsResult] = await Promise.all([
    supabase
      .from("judging_assignments")
      .select(
        `team_id,
         team:teams(team_name, count,
           submission:submissions(category, submitted_at),
           members:profiles(id)
         )`,
      )
      .eq("judge_id", user.id),
    supabase
      .from("rubric_categories")
      .select("rubric_type, total_pts")
      .order("rubric_type"),
  ]);

  const assignments = await Promise.all(
    (assignmentsResult.data ?? []).map(async (a: any) => {
      const team = a.team;
      const sub = Array.isArray(team?.submission)
        ? team.submission[0]
        : team?.submission;

      const { count: scoredCount } = await supabase
        .from("judging_scores")
        .select("*", { count: "exact", head: true })
        .eq("team_id", a.team_id)
        .eq("judge_id", user.id);

      const { count: totalCriteria } = sub?.category
        ? await supabase
            .from("rubric_criteria")
            .select("id", { count: "exact", head: true })
            .in(
              "category_id",
              (
                await supabase
                  .from("rubric_categories")
                  .select("id")
                  .eq("rubric_type", sub.category)
              ).data?.map((c: any) => c.id) ?? [],
            )
        : { count: 0 };

      return {
        teamId: a.team_id as string,
        teamName: team?.team_name ?? "Unknown",
        category: sub?.category ?? null,
        memberCount: (team?.members ?? []).length,
        submittedAt: sub?.submitted_at ?? null,
        scoredCount: scoredCount ?? 0,
        totalCriteria: totalCriteria ?? 0,
      };
    }),
  );

  const rubricMap = new Map<string, { count: number; pts: number }>();
  for (const r of rubricsResult.data ?? []) {
    const existing = rubricMap.get(r.rubric_type) ?? { count: 0, pts: 0 };
    rubricMap.set(r.rubric_type, {
      count: existing.count + 1,
      pts: existing.pts + r.total_pts,
    });
  }

  const rubrics = Array.from(rubricMap.entries()).map(
    ([type, { count, pts }]) => ({
      type,
      categoryCount: count,
      totalPts: pts,
    }),
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        My Dashboard
      </h1>
      <JudgeTabs assignments={assignments} rubrics={rubrics} />
    </div>
  );
}
