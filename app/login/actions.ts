"use server";

import { createClient } from "@/lib/supabase/server";

export async function insertProfile(userId: string, email: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").insert({
    id: userId,
    email,
    role: "student",
  });
  return { error: error?.message ?? null };
}
