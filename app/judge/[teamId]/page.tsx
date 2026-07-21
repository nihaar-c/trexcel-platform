import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ScoringView from "./ScoringView";

export default async function JudgeScoringPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Confirm this judge is assigned to this team
  const { data: assignment } = await supabase
    .from("judging_assignments")
    .select("team_id")
    .eq("judge_id", user.id)
    .eq("team_id", teamId)
    .maybeSingle();

  if (!assignment) notFound();

  const [teamResult, submissionResult, existingScores] = await Promise.all([
    supabase
      .from("teams")
      .select("team_name, count, members:profiles(id, email, first_name, last_name, role)")
      .eq("id", teamId)
      .single(),
    supabase
      .from("submissions")
      .select("description, file_url, submitted_at, category, status")
      .eq("team_id", teamId)
      .maybeSingle(),
    supabase
      .from("judging_scores")
      .select("criterion_id, score, locked")
      .eq("team_id", teamId)
      .eq("judge_id", user.id),
  ]);

  if (teamResult.error || !teamResult.data) notFound();

  const team = teamResult.data;
  const sub = submissionResult.data;
  const category = sub?.category?.toUpperCase() ?? null;

  let criteria: {
    id: string;
    name: string;
    min_score: number;
    max_score: number;
    score_weight: number;
    category_name: string;
    initial_score: number | null;
  }[] = [];

  if (category) {
    const { data: rubricCats } = await supabase
      .from("rubric_categories")
      .select(
        `id, name, display_order,
         criteria:rubric_criteria(id, name, min_score, max_score, score_weight, display_order)`,
      )
      .eq("rubric_type", category)
      .order("display_order");

    const scoreMap = new Map(
      (existingScores.data ?? []).map((s) => [s.criterion_id, s.score]),
    );

    for (const cat of rubricCats ?? []) {
      const sorted = [...(cat.criteria ?? [])].sort(
        (a, b) => a.display_order - b.display_order,
      );
      for (const cr of sorted) {
        criteria.push({
          id: cr.id,
          name: cr.name,
          min_score: cr.min_score,
          max_score: cr.max_score,
          score_weight: cr.score_weight,
          category_name: cat.name,
          initial_score: scoreMap.get(cr.id) ?? null,
        });
      }
    }
  }

  const isLocked = (existingScores.data ?? []).some((s) => s.locked);

  const members = (team.members ?? []) as {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    role: string | null;
  }[];

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          href="/judge"
          className="hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-50">{team.team_name}</span>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left — submission info */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Submission
          </h2>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {team.team_name}
                </p>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                  {category ?? "No category"} ·{" "}
                  {sub?.submitted_at
                    ? new Date(sub.submitted_at).toLocaleDateString()
                    : "Not submitted"}
                </p>
              </div>
            </div>

            {sub?.description && (
              <p className="mt-4 text-sm text-zinc-700 dark:text-zinc-300">
                {sub.description}
              </p>
            )}

            {sub?.file_url && (
              <a
                href={sub.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                Download submission →
              </a>
            )}

            {!sub && (
              <p className="mt-4 text-sm text-zinc-400 dark:text-zinc-500">
                No submission uploaded yet.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-3 text-xs font-semibold tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
              Team members
            </p>
            <div className="flex flex-col gap-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between">
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {m.first_name || m.last_name
                      ? `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim()
                      : m.email ?? "Unknown"}
                  </p>
                  {m.role === "mentor" && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      Mentor
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — rubric scoring */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Rubric — {category ?? "—"}
          </h2>
          {criteria.length > 0 ? (
            <ScoringView
              teamId={teamId}
              criteria={criteria}
              isLocked={isLocked}
            />
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No rubric available — team has not selected a category.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
