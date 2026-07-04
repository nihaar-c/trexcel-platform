import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

async function logout() {
  "use server";

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-950">
      <main className="flex w-full max-w-md flex-col items-center rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-1 text-sm font-medium tracking-widest text-zinc-500 uppercase dark:text-zinc-400">
          TrExcel 2027
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Welcome back
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Logged in as{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            {user.email}
          </span>
        </p>

        <form action={logout} className="mt-6 w-full">
          <button
            type="submit"
            className="w-full rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            Log Out
          </button>
        </form>
      </main>
    </div>
  );
}
