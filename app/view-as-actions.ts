"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function setViewAs(role: "student" | "judge") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return;

  const cookieStore = await cookies();
  cookieStore.set("trexcel-view-as", role, { path: "/", httpOnly: false });
}

export async function clearViewAs() {
  const cookieStore = await cookies();
  cookieStore.delete("trexcel-view-as");
}
