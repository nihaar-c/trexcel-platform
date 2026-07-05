"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

type ActionState = { error: string } | null;
type ProfileActionState = { error?: string; success?: boolean } | null;

export async function createTeam(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const teamName = (formData.get("team_name") as string)?.trim();

  if (!teamName) return { error: "Team name is required." };

  const inviteCode = randomBytes(3).toString("hex").toUpperCase();

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({ team_name: teamName, invite_code: inviteCode, count: 1 })
    .select("id")
    .single();

  if (teamError) return { error: teamError.message };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ team_id: team.id })
    .eq("id", user.id);

  if (profileError) return { error: profileError.message };

  redirect("/dashboard");
}

export async function joinTeam(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const inviteCode = (formData.get("invite_code") as string)
    ?.trim()
    .toUpperCase();

  if (!inviteCode) return { error: "Invite code is required." };

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, count")
    .eq("invite_code", inviteCode)
    .single();

  if (teamError || !team) {
    return { error: "Team not found. Check the code and try again." };
  }

  if ((team.count ?? 0) >= 3) {
    return { error: "This team is full (max 3 members)." };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ team_id: team.id })
    .eq("id", user.id);

  if (profileError) return { error: profileError.message };

  await supabase
    .from("teams")
    .update({ count: (team.count ?? 0) + 1 })
    .eq("id", team.id);

  redirect("/dashboard");
}

export async function saveStudentInfo(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const str = (key: string) =>
    (formData.get(key) as string)?.trim() || null;

  const genderOption = str("gender_option");
  const genderOther = str("gender_other");
  const gender =
    genderOption === "Other" ? genderOther || "Other" : genderOption;

  const avatarUrl = str("existing_avatar_url");

  const { error } = await supabase.from("student_details").upsert(
    {
      user_id: user.id,
      first_name: str("first_name"),
      last_name: str("last_name"),
      phone: str("phone"),
      gender,
      race: str("race"),
      parent_first_name: str("parent_first_name"),
      parent_last_name: str("parent_last_name"),
      parent_email: str("parent_email"),
      parent_phone: str("parent_phone"),
      address: str("address"),
      city: str("city"),
      state: str("state"),
      zip_code: str("zip_code"),
      avatar_url: avatarUrl,
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}
