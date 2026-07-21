import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import SubmissionsClient from "./SubmissionsClient";

export default async function SubmissionsPage() {
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

  if (profile?.role === "mentor") {
    redirect("/dashboard");
  }

  const hasTeam = !!profile?.team_id;

  const [teamResult, submissionsResult] = await Promise.all([
    hasTeam
      ? supabase
          .from("teams")
          .select("team_name, theme, memo")
          .eq("id", profile!.team_id!)
          .single()
      : Promise.resolve({ data: null }),
    hasTeam
      ? supabase
          .from("submissions")
          .select(
            "id, category, title, description, ai_description, help_received, file_url, status, submitted_at",
          )
          .eq("team_id", profile!.team_id!)
      : Promise.resolve({ data: [] }),
  ]);

  const team = teamResult.data ?? { team_name: "Your Team", theme: null, memo: null };

  const submissionsByCategory = Object.fromEntries(
    (submissionsResult.data ?? []).map((s) => [s.category, s]),
  );

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-4xl px-6 py-8">
        <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/dashboard" className="hover:text-zinc-900 dark:hover:text-zinc-50">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-zinc-900 dark:text-zinc-50">Submissions</span>
        </div>

        <div className="mb-8">
          <p className="mb-1 text-xs font-semibold tracking-widest text-brand-dark uppercase dark:text-brand-gold">
            TrExcel 2027
          </p>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {team.team_name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            One submission per category. Switch between STEM, ART, and FITNESS using the tabs below.
          </p>
        </div>

        <SubmissionsClient
          team={team}
          submissionsByCategory={submissionsByCategory}
          readOnly={!hasTeam}
        />
      </div>
    </div>
  );
}
