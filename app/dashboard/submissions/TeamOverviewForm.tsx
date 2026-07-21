"use client";

import { useActionState } from "react";
import { saveTeamOverview } from "../actions";

type Props = {
  theme: string | null;
  memo: string | null;
  readOnly?: boolean;
};

export default function TeamOverviewForm({ theme, memo, readOnly = false }: Props) {
  const [state, formAction, isPending] = useActionState(saveTeamOverview, null);

  return (
    <form action={formAction} className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:gap-6">
        <div className="flex flex-col gap-1.5 sm:w-64">
          <label className="text-xs font-semibold tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
            Team Theme
          </label>
          <input
            name="theme"
            type="text"
            defaultValue={theme ?? ""}
            placeholder="e.g. Water Conservation"
            disabled={readOnly}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-dark disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
            Team Memo
          </label>
          <input
            name="memo"
            type="text"
            defaultValue={memo ?? ""}
            placeholder="A unifying statement that connects all three submissions…"
            disabled={readOnly}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-dark disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
          />
        </div>
      </div>

      {!readOnly && (
        <div className="flex shrink-0 flex-col items-end gap-1">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-brand-dark px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save Overview"}
          </button>
          {state?.success && (
            <p className="text-xs text-green-600 dark:text-green-400">Saved.</p>
          )}
          {state?.error && (
            <p className="text-xs text-red-500">{state.error}</p>
          )}
        </div>
      )}
    </form>
  );
}
