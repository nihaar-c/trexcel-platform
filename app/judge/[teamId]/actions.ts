"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function assertJudgeAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  judgeId: string,
  teamId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("judging_assignments")
    .select("team_id")
    .eq("judge_id", judgeId)
    .eq("team_id", teamId)
    .maybeSingle();
  return data !== null;
}

export async function saveScore(criterionId: string, teamId: string, score: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const assigned = await assertJudgeAssignment(supabase, user.id, teamId);
  if (!assigned) return { error: "Not authorized to score this team." };

  const { data: criterion } = await supabase
    .from("rubric_criteria")
    .select("min_score, max_score")
    .eq("id", criterionId)
    .single();

  if (!criterion) return { error: "Invalid criterion." };

  const scoreInt = Math.floor(score);
  if (scoreInt < criterion.min_score || scoreInt > criterion.max_score) {
    return { error: `Score must be between ${criterion.min_score} and ${criterion.max_score}.` };
  }

  const { error } = await supabase.from("judging_scores").upsert(
    {
      team_id: teamId,
      judge_id: user.id,
      criterion_id: criterionId,
      score: scoreInt,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "judge_id,criterion_id,team_id" },
  );

  if (error) return { error: error.message };
  revalidatePath(`/judge/${teamId}`);
  return { success: true };
}

export async function lockScores(teamId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const assigned = await assertJudgeAssignment(supabase, user.id, teamId);
  if (!assigned) return { error: "Not authorized to lock scores for this team." };

  const { error } = await supabase
    .from("judging_scores")
    .update({ locked: true })
    .eq("team_id", teamId)
    .eq("judge_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/judge/${teamId}`);
  return { success: true };
}
