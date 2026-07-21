"use client";

import { useState } from "react";
import Link from "next/link";

type Assignment = {
  teamId: string;
  teamName: string;
  category: string | null;
  memberCount: number;
  submittedAt: string | null;
  scoredCount: number;
  totalCriteria: number;
};

type RubricSummary = {
  type: string;
  categoryCount: number;
  totalPts: number;
};

type Props = {
  assignments: Assignment[];
  rubrics: RubricSummary[];
};

type Tab = "assignments" | "rubrics";

const STATUS_CHIP = (scored: number, total: number) => {
  if (scored === 0)
    return (
      <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        Not Started
      </span>
    );
  if (scored < total)
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        In Progress
      </span>
    );
  return (
    <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
      Submitted
    </span>
  );
};

const RUBRIC_COLORS: Record<string, string> = {
  ART: "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800",
  STEM: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
  FITNESS:
    "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
};

export default function JudgeTabs({ assignments, rubrics }: Props) {
  const [tab, setTab] = useState<Tab>("assignments");

  return (
    <div>
      <div className="flex gap-1 rounded-lg border border-zinc-200 p-1 dark:border-zinc-700 w-fit mb-6">
        {(["assignments", "rubrics"] as Tab[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-md px-5 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === id
                ? "bg-brand-dark text-white"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            }`}
          >
            {id === "assignments"
              ? `Assignments (${assignments.length})`
              : "Rubrics"}
          </button>
        ))}
      </div>

      {tab === "assignments" && (
        <div className="flex flex-col gap-3">
          {assignments.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No assignments yet.
            </p>
          )}
          {assignments.map((a) => (
            <Link
              key={a.teamId}
              href={`/judge/${a.teamId}`}
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {a.teamName}
                </p>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                  {a.memberCount} member{a.memberCount !== 1 ? "s" : ""}
                  {a.category ? ` · ${a.category}` : ""}
                  {a.submittedAt
                    ? ` · Submitted ${new Date(a.submittedAt).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {STATUS_CHIP(a.scoredCount, a.totalCriteria)}
                <span className="text-zinc-400 dark:text-zinc-500">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === "rubrics" && (
        <div className="grid gap-4 sm:grid-cols-3">
          {rubrics.map((r) => (
            <Link
              key={r.type}
              href={`/judge/rubrics/${r.type.toLowerCase()}`}
              className={`flex flex-col rounded-xl border p-6 transition-shadow hover:shadow-md ${RUBRIC_COLORS[r.type] ?? ""}`}
            >
              <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {r.type}
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {r.categoryCount} categories · {r.totalPts} pts max
              </p>
              <p className="mt-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                View rubric →
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
