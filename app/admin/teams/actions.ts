"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_CHECKPOINTS } from "@/lib/checkpoints";

export async function setCheckpoint(
  teamId: string,
  checkpoint: number,
  submitted: boolean,
): Promise<{ error?: string }> {
  if (!(ADMIN_CHECKPOINTS as readonly number[]).includes(checkpoint)) {
    return { error: "Invalid checkpoint." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Admins only." };

  const { error } = submitted
    ? await supabase
        .from("checkpoint_submissions")
        .upsert(
          { team_id: teamId, checkpoint, submitted_by: user.id },
          { onConflict: "team_id,checkpoint", ignoreDuplicates: true },
        )
    : await supabase
        .from("checkpoint_submissions")
        .delete()
        .eq("team_id", teamId)
        .eq("checkpoint", checkpoint);

  if (error) return { error: error.message };

  revalidatePath("/admin/teams");
  return {};
}
