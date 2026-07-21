import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function JudgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "judge" && profile?.role !== "admin") redirect("/dashboard");

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-8 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
          TrExcel 2027 — Judge Portal
        </p>
      </header>
      <div className="flex-1 px-8 py-8">{children}</div>
    </div>
  );
}
