import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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

  const isStudent = !profile?.role || profile.role === "student";

  const [teamResult, studentDetailsResult] = await Promise.all([
    isStudent && profile?.team_id
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
  ]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-950">
      <DashboardTabs
        email={user.email!}
        userId={user.id}
        profile={profile}
        team={teamResult.data}
        studentDetails={studentDetailsResult.data}
      />
    </div>
  );
}
