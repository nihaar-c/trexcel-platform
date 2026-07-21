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

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("team_id")
    .eq("id", user.id)
    .single();

  if (existingProfile?.team_id) {
    return { error: "You are already on a team. Leave your current team first." };
  }

  const teamName = (formData.get("team_name") as string)?.trim();

  if (!teamName) return { error: "Team name is required." };
  if (teamName.length > 100) return { error: "Team name must be 100 characters or fewer." };

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

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("team_id")
    .eq("id", user.id)
    .single();

  if (existingProfile?.team_id) {
    return { error: "You are already on a team. Leave your current team first." };
  }

  const inviteCode = (formData.get("invite_code") as string)
    ?.trim()
    .toUpperCase();

  if (!inviteCode) return { error: "Invite code is required." };
  if (!/^[A-F0-9]{6}$/.test(inviteCode)) return { error: "Invalid invite code format." };

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, count")
    .eq("invite_code", inviteCode)
    .single();

  if (teamError || !team) {
    return { error: "Team not found. Check the code and try again." };
  }

  if ((team.count ?? 0) >= 4) {
    return { error: "This team is full (max 3 students + 1 mentor)." };
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

type SubmissionState = { error?: string; success?: boolean } | null;

export async function upsertSubmission(
  _prev: SubmissionState,
  formData: FormData,
): Promise<SubmissionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("team_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.team_id) return { error: "You must be on a team to submit." };
  if (profile.role === "mentor") return { error: "Mentors cannot submit." };

  const ALLOWED_CATEGORIES = ["STEM", "ART", "FITNESS"] as const;
  const ALLOWED_STATUSES = ["draft", "submitted"] as const;

  const str = (k: string) => (formData.get(k) as string)?.trim() || null;
  const category = str("category");
  if (!category || !ALLOWED_CATEGORIES.includes(category as typeof ALLOWED_CATEGORIES[number])) {
    return { error: "Invalid category." };
  }

  const statusRaw = (formData.get("status") as string)?.trim();
  if (!ALLOWED_STATUSES.includes(statusRaw as typeof ALLOWED_STATUSES[number])) {
    return { error: "Invalid status." };
  }
  const status = statusRaw as typeof ALLOWED_STATUSES[number];

  const fileUrlRaw = str("file_url");
  if (fileUrlRaw !== null) {
    try {
      const parsed = new URL(fileUrlRaw);
      if (parsed.protocol !== "https:") return { error: "File URL must use HTTPS." };
    } catch {
      return { error: "File URL is not a valid URL." };
    }
  }

  const { error } = await supabase.from("submissions").upsert(
    {
      team_id: profile.team_id,
      category,
      title: str("title"),
      description: str("description"),
      ai_description: str("ai_description"),
      help_received: str("help_received"),
      file_url: fileUrlRaw,
      status,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "team_id,category" },
  );

  if (error) return { error: error.message };

  revalidatePath("/dashboard/submissions");
  return { success: true };
}

export async function saveTeamOverview(
  _prev: SubmissionState,
  formData: FormData,
): Promise<SubmissionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("team_id")
    .eq("id", user.id)
    .single();

  if (!profile?.team_id) return { error: "No team found." };

  const theme = (formData.get("theme") as string)?.trim() || null;
  const memo = (formData.get("memo") as string)?.trim() || null;

  const { error } = await supabase
    .from("teams")
    .update({ theme, memo })
    .eq("id", profile.team_id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/submissions");
  return { success: true };
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
      school_name: str("school_name"),
      student_id: str("student_id"),
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
