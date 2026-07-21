import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-12 dark:bg-zinc-950">
      <main className="flex w-full max-w-2xl flex-col rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-1 text-sm font-medium tracking-widest text-zinc-500 uppercase dark:text-zinc-400">
          TrExcel 2027
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Account
        </h1>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          {user.email}
        </p>

        <ChangePasswordForm />
      </main>
    </div>
  );
}
