"use server";

import { createClient } from "@/lib/supabase/server";

type ActionState = { error?: string; success?: boolean } | null;

export async function changePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Not authenticated." };

  const oldPassword = formData.get("old_password") as string;
  const newPassword = formData.get("new_password") as string;

  if (!oldPassword || !newPassword) return { error: "All fields are required." };
  if (newPassword.length < 8) return { error: "New password must be at least 8 characters." };
  if (oldPassword === newPassword) return { error: "New password must differ from current password." };

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: oldPassword,
  });

  if (verifyError) return { error: "Current password is incorrect." };

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) return { error: updateError.message };

  return { success: true };
}
