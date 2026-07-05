"use client";

import { useActionState } from "react";
import { changePassword } from "./actions";

export default function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);

  return (
    <div className="mt-8 border-t border-zinc-100 pt-8 dark:border-zinc-800">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        Change password
      </h2>

      {state?.success ? (
        <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
          Password updated successfully.
        </p>
      ) : (
        <form action={action} className="mt-4 flex flex-col gap-4">
          {state?.error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              {state.error}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Current password
            </label>
            <input
              name="old_password"
              type="password"
              required
              className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              New password
            </label>
            <input
              name="new_password"
              type="password"
              required
              minLength={8}
              className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </div>
  );
}
