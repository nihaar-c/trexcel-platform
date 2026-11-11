"use client";

import { useState, useTransition } from "react";
import { confirmCheckpoint } from "./actions";
import { CHECKPOINT_FORMS } from "@/lib/checkpoints";

export default function CheckpointTab({
  checkpoint,
  hasTeam,
  confirmed,
  profileComplete,
  waiverComplete,
  onNavigate,
}: {
  checkpoint: 1 | 2;
  hasTeam: boolean;
  confirmed: boolean;
  profileComplete: boolean;
  waiverComplete: boolean;
  onNavigate: (tab: "profile" | "waiver") => void;
}) {
  const [done, setDone] = useState(confirmed);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const url = CHECKPOINT_FORMS[checkpoint];

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await confirmCheckpoint(checkpoint);
      if (res.error) setError(res.error);
      else setDone(true);
    });
  }

  if ((!profileComplete || !waiverComplete) && !done) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Checkpoint {checkpoint}
        </h2>
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
        >
          <p>
            Before submitting Checkpoint {checkpoint}, you need to:
          </p>
          <ul className="list-disc pl-5">
            {!profileComplete && (
              <li>Complete your entire profile, including your profile picture.</li>
            )}
            {!waiverComplete && <li>Complete your waiver.</li>}
          </ul>
          <div className="flex gap-2">
            {!profileComplete && (
              <button
                type="button"
                onClick={() => onNavigate("profile")}
                className="rounded-md bg-brand-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark-hover"
              >
                Go to Info
              </button>
            )}
            {!waiverComplete && (
              <button
                type="button"
                onClick={() => onNavigate("waiver")}
                className="rounded-md bg-brand-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark-hover"
              >
                Go to Waivers
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Checkpoint {checkpoint}
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          One submission per team. You need to be signed in to Google to upload files.{" "}
          Having trouble?{" "}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-dark underline dark:text-brand-gold"
          >
            Open the form in a new tab
          </a>
          .
        </p>
      </div>

      {done ? (
        <div
          role="status"
          className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
        >
          Your team has marked Checkpoint {checkpoint} as submitted.
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-950">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            After you submit the form below, confirm it here so organizers can see it.
          </p>
          {!hasTeam && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Join or create a team first (Team tab).
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending || !hasTeam}
            className="self-start rounded-md bg-brand-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark-hover disabled:opacity-50"
          >
            {isPending ? "Saving…" : `I've submitted Checkpoint ${checkpoint}`}
          </button>
        </div>
      )}

      <iframe
        src={`${url}?embedded=true`}
        title={`Checkpoint ${checkpoint} form`}
        className="h-[1400px] w-full rounded-md border border-zinc-200 dark:border-zinc-700"
      >
        Loading…
      </iframe>
    </div>
  );
}
