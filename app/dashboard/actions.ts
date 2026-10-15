"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import { Resend } from "resend";

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

  // Atomic capacity check + count increment + profile update in one DB call.
  // The join_team function uses FOR UPDATE to serialize concurrent joins.
  const { data, error } = await supabase.rpc("join_team", {
    p_invite_code: inviteCode,
    p_user_id: user.id,
  });

  if (error) return { error: error.message };
  if (data?.error) return { error: data.error as string };

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

  // Waiver gate: a finalized submission requires this user to have a completed
  // waiver. Drafts are still allowed so students can save progress beforehand.
  const statusIsFinal = (formData.get("status") as string)?.trim() === "submitted";
  if (statusIsFinal) {
    const { data: waiver } = await supabase
      .from("waivers")
      .select("completed_at")
      .eq("user_id", user.id)
      .single();
    if (!waiver?.completed_at) {
      return { error: "You must complete your waiver before submitting." };
    }
  }

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
      // Only stamp submitted_at when actually submitting; drafts leave the
      // existing value (or the DB default on first insert) unchanged.
      ...(status === "submitted" && { submitted_at: new Date().toISOString() }),
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

export async function saveMentorRequest(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const memo = (formData.get("memo") as string)?.trim().slice(0, 1000) || null;

  const { error } = await supabase
    .from("profiles")
    .update({ mentor_request_memo: memo })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function saveWaiver(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const str = (key: string) => (formData.get(key) as string)?.trim() || null;
  const fileUrl = str("file_url");
  const agreed = formData.get("agreed") === "on" || formData.get("agreed") === "true";
  const mediaConsent =
    formData.get("media_consent") === "on" || formData.get("media_consent") === "true";

  const studentFullName = str("student_full_name");
  const parentName = str("parent_name");
  const parentPhone = str("parent_phone");
  const parentEmail = str("parent_email");
  const parentSignature = str("parent_signature");
  const studentSignature = str("student_signature");
  const signedDate = str("signed_date");

  // Two completion paths: a signed PDF was uploaded, OR the full form was filled
  // out and the terms were agreed to.
  const formComplete =
    !!studentFullName &&
    !!parentName &&
    !!parentPhone &&
    !!parentEmail &&
    !!parentSignature &&
    !!studentSignature &&
    !!signedDate &&
    agreed;
  const isComplete = !!fileUrl || formComplete;

  if (!isComplete) {
    return { error: "Fill out the full waiver and agree to the terms, or upload a signed copy." };
  }

  const { error } = await supabase.from("waivers").upsert(
    {
      user_id: user.id,
      student_full_name: studentFullName,
      parent_name: parentName,
      parent_phone: parentPhone,
      parent_email: parentEmail,
      parent_signature: parentSignature,
      student_signature: studentSignature,
      signed_date: signedDate,
      media_consent: mediaConsent,
      agreed,
      file_url: fileUrl,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/submissions");
  return { success: true };
}

export async function submitHelpRequest(
  message: string,
  fileUrl: string | null,
  fileName: string | null,
): Promise<ProfileActionState> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    const trimmed = message.trim().slice(0, 2000);
    if (!trimmed) return { error: "Please describe your issue before submitting." };

    const { data: details } = await supabase
      .from("student_details")
      .select("first_name, last_name")
      .eq("user_id", user.id)
      .single();

    const name = details?.first_name
      ? `${details.first_name} ${details.last_name ?? ""}`.trim()
      : user.email ?? "Unknown student";

    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const attachmentLine = fileUrl && fileName
      ? `<p><strong>Attachment:</strong> <a href="${fileUrl}">${esc(fileName)}</a></p>`
      : "";

    const resend = new Resend(process.env.RESEND_API_KEY);
    const toEmail = process.env.HELP_EMAIL ?? "nihaar.char@gmail.com";

    const { error: emailError } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: [toEmail],
      subject: `Help Request from ${name}`,
      html: `
        <h2>Student Help Request</h2>
        <p><strong>From:</strong> ${name}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <hr />
        <p><strong>Message:</strong></p>
        <p style="white-space:pre-wrap">${esc(trimmed)}</p>
        ${attachmentLine}
      `,
    });

    if (emailError) return { error: "Could not send your request. Please try again." };

    return { success: true };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
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
