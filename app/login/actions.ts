"use server";

import { createClient } from "@/lib/supabase/server";

export async function insertProfile(userId: string, email: string) {
  const supabase = await createClient();
  await supabase.from("profiles").insert({
    id: userId,
    email,
    role: "student",
  });
}
