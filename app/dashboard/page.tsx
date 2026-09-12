import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import DashboardTabs from "./DashboardTabs";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, team_id")
    .eq("id", user.id)
    .single();

  const cookieStore = await cookies();
  const viewAs = cookieStore.get("trexcel-view-as")?.value;
  const effectiveRole =
    profile?.role === "admin" && viewAs === "student" ? "student" : (profile?.role ?? "student");

  const role = effectiveRole;
  const isStudent = role === "student" || !role;
  const isMentor = role === "mentor";

  const [teamResult, studentDetailsResult, waiverResult] = await Promise.all([
    (isStudent || isMentor) && profile?.team_id
      ? supabase
          .from("teams")
          .select("team_name, invite_code, count")
          .eq("id", profile.team_id)
          .single()
      : Promise.resolve({ data: null }),
    isStudent
      ? supabase
          .from("student_details")
          .select("*")
          .eq("user_id", user.id)
          .single()
      : Promise.resolve({ data: null }),
    isStudent
      ? supabase
          .from("waivers")
          .select(
            "student_full_name, parent_name, parent_phone, parent_email, parent_signature, student_signature, signed_date, media_consent, agreed, file_url, completed_at",
          )
          .eq("user_id", user.id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-12 dark:bg-zinc-950">
      <DashboardTabs
        email={user.email!}
        userId={user.id}
        profile={profile ? { ...profile, role: effectiveRole } : profile}
        team={teamResult.data}
        studentDetails={studentDetailsResult.data}
        waiver={waiverResult.data}
      />
    </div>
  );
}
