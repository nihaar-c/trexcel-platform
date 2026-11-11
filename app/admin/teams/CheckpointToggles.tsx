"use client";

import { useState, useTransition } from "react";
import { setCheckpoint } from "./actions";

export default function CheckpointToggles({
  teamId,
  checkpoints,
  initial,
}: {
  teamId: string;
  checkpoints: readonly number[];
  initial: number[];
}) {
  const [done, setDone] = useState<Set<number>>(new Set(initial));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(cp: number, next: boolean) {
    const prev = done;
    const updated = new Set(done);
    if (next) updated.add(cp);
    else updated.delete(cp);
    setDone(updated);
    setError(null);
    startTransition(async () => {
      const res = await setCheckpoint(teamId, cp, next);
      if (res.error) {
        setDone(prev);
        setError(res.error);
      }
    });
  }

  return (
    <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {checkpoints.map((cp) => (
          <label
            key={cp}
            className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300"
          >
            <input
              type="checkbox"
              checked={done.has(cp)}
              disabled={isPending}
              onChange={(e) => toggle(cp, e.target.checked)}
              className="h-4 w-4 accent-green-600"
            />
            Checkpoint {cp}
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
