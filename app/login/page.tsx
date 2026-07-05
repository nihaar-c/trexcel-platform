"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { insertProfile } from "./actions";

type View = "auth" | "forgot";

const inputCls =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";
const labelCls = "text-sm font-medium text-zinc-700 dark:text-zinc-300";

export default function LoginPage() {
  const [view, setView] = useState<View>("auth");
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleLogin(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        return;
      }
      window.location.href = "/dashboard";
    });
  }

  function handleSignup(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("already registered") || msg.includes("already been registered")) {
          setError("An account with this email already exists. Log in or reset your password.");
        } else {
          setError(error.message);
        }
        return;
      }
      // Supabase silently succeeds for existing emails when confirmation is on
      if (data.user && data.user.identities?.length === 0) {
        setError("An account with this email already exists. Log in or reset your password.");
        return;
      }
      if (data.user) {
        await insertProfile(data.user.id, email);
      }
      window.location.href = "/dashboard";
    });
  }

  function handleForgotPassword(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const email = formData.get("email") as string;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) {
        setError(error.message);
        return;
      }
      setResetSent(true);
    });
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 text-center">
          <p className="mb-1 text-sm font-medium tracking-widest text-zinc-500 uppercase dark:text-zinc-400">
            TrExcel 2027
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {view === "auth" ? "Sign in to your account" : "Reset your password"}
          </h1>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
          >
            {error}
          </div>
        )}

        {view === "auth" ? (
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className={labelCls}>Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className={labelCls}>Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className={inputCls}
              />
            </div>
            <div className="mt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={isPending}
                formAction={handleLogin}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                {isPending ? "Please wait…" : "Log In"}
              </button>
              <button
                type="submit"
                disabled={isPending}
                formAction={handleSignup}
                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
              >
                {isPending ? "Please wait…" : "Sign Up"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setError(null); setView("forgot"); }}
              className="mt-1 text-center text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              Forgot your password?
            </button>
          </form>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); handleForgotPassword(new FormData(e.currentTarget)); }}>
            {resetSent ? (
              <p className="rounded-md bg-green-50 px-3 py-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
                Check your email for a reset link.
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reset-email" className={labelCls}>Email</label>
                  <input
                    id="reset-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className={inputCls}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  {isPending ? "Sending…" : "Send Reset Link"}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => { setError(null); setResetSent(false); setView("auth"); }}
              className="text-center text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              Back to log in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
