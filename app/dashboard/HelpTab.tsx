"use client";

import { useActionState, useRef } from "react";
import { submitHelpRequest } from "./actions";

export default function HelpTab() {
  const [state, formAction, isPending] = useActionState(submitHelpRequest, null);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Get Help
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Having trouble? Send us a message and we&apos;ll get back to you.
        </p>
      </div>

      {state?.error && (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
        >
          {state.error}
        </div>
      )}

      {state?.success ? (
        <div
          role="status"
          className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
        >
          Your message has been sent! We&apos;ll be in touch soon.
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              What do you need help with?
            </span>
            <textarea
              name="message"
              rows={6}
              maxLength={2000}
              placeholder="Need help with the competition website?"
              required
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Attach a file{" "}
              <span className="font-normal text-zinc-400">(optional, max 10 MB)</span>
            </span>
            <input
              ref={fileRef}
              name="attachment"
              type="file"
              className="text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 dark:text-zinc-300 dark:file:bg-zinc-800 dark:file:text-zinc-300"
            />
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="self-start rounded-md bg-brand-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark-hover disabled:opacity-50"
          >
            {isPending ? "Sending…" : "Submit"}
          </button>
        </form>
      )}
    </div>
  );
}
