"use client";

import { useState, useTransition } from "react";
import { saveScore, lockScores } from "./actions";

type Criterion = {
  id: string;
  name: string;
  min_score: number;
  max_score: number;
  score_weight: number;
  category_name: string;
  initial_score: number | null;
};

type Props = {
  teamId: string;
  criteria: Criterion[];
  isLocked: boolean;
};

export default function ScoringView({ teamId, criteria, isLocked }: Props) {
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const c of criteria) {
      if (c.initial_score !== null) init[c.id] = c.initial_score;
    }
    return init;
  });
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locked, setLocked] = useState(isLocked);
  const [isPending, startTransition] = useTransition();

  const handleBlur = (criterionId: string, value: number, min: number, max: number) => {
    const clamped = Math.min(max, Math.max(min, value));
    setScores((s) => ({ ...s, [criterionId]: clamped }));
    setSaving((s) => ({ ...s, [criterionId]: true }));
    startTransition(async () => {
      const result = await saveScore(criterionId, teamId, clamped);
      setSaving((s) => ({ ...s, [criterionId]: false }));
      if (result?.error) {
        setErrors((e) => ({ ...e, [criterionId]: result.error! }));
      } else {
        setErrors((e) => { const n = { ...e }; delete n[criterionId]; return n; });
      }
    });
  };

  const handleSubmitFinal = () => {
    startTransition(async () => {
      const result = await lockScores(teamId);
      if (!result?.error) setLocked(true);
    });
  };

  const total = criteria.reduce((sum, c) => {
    const s = scores[c.id];
    return sum + (s !== undefined ? s * c.score_weight : 0);
  }, 0);

  const maxTotal = criteria.reduce(
    (sum, c) => sum + c.max_score * c.score_weight,
    0,
  );

  const allScored = criteria.every((c) => scores[c.id] !== undefined);

  const grouped = criteria.reduce<Record<string, Criterion[]>>((acc, c) => {
    if (!acc[c.category_name]) acc[c.category_name] = [];
    acc[c.category_name].push(c);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-4">
      {locked && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400">
          Scores submitted and locked.
        </div>
      )}

      {Object.entries(grouped).map(([catName, crits]) => (
        <div
          key={catName}
          className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">
              {catName}
            </p>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {crits.map((c) => (
              <div key={c.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {c.name}
                    {c.score_weight > 1 && (
                      <span className="ml-2 text-xs text-blue-500">
                        ×{c.score_weight}
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min={c.min_score}
                      max={c.max_score}
                      disabled={locked}
                      value={scores[c.id] ?? ""}
                      onChange={(e) =>
                        setScores((s) => ({
                          ...s,
                          [c.id]: Number(e.target.value),
                        }))
                      }
                      onBlur={(e) =>
                        !locked &&
                        handleBlur(c.id, Number(e.target.value), c.min_score, c.max_score)
                      }
                      className="w-16 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-center text-sm font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-dark disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                      placeholder="—"
                    />
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      / {c.max_score}
                    </span>
                    {saving[c.id] && (
                      <span className="text-xs text-zinc-400">saving…</span>
                    )}
                  </div>
                </div>
                {errors[c.id] && (
                  <p className="mt-1 text-xs text-red-500">{errors[c.id]}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Total
        </p>
        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          {total} / {maxTotal}
        </p>
      </div>

      {!locked && (
        <button
          type="button"
          disabled={!allScored || isPending}
          onClick={handleSubmitFinal}
          className="w-full rounded-lg bg-brand-dark py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {isPending ? "Submitting…" : "Submit Final Scores"}
        </button>
      )}
      {!locked && !allScored && (
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
          Score all criteria to submit.
        </p>
      )}
    </div>
  );
}
