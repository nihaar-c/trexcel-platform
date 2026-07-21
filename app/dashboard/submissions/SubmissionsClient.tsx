"use client";

import { useState } from "react";
import SubmissionColumn from "./SubmissionColumn";
import TeamOverviewForm from "./TeamOverviewForm";

type Submission = {
  id: string;
  title: string | null;
  description: string | null;
  ai_description: string | null;
  help_received: string | null;
  file_url: string | null;
  status: string | null;
  submitted_at: string;
} | null;

type Team = {
  team_name: string;
  theme: string | null;
  memo: string | null;
};

type Props = {
  team: Team;
  submissionsByCategory: Record<string, Submission>;
  readOnly?: boolean;
};

const CATEGORIES = ["STEM", "ART", "FITNESS"] as const;
type Category = (typeof CATEGORIES)[number];

const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  reviewed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  draft: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

const CATEGORY_ACCENT: Record<Category, string> = {
  ART: "border-rose-400",
  STEM: "border-blue-400",
  FITNESS: "border-emerald-400",
};

const CATEGORY_ACTIVE: Record<Category, string> = {
  ART: "border-b-2 border-b-rose-400 text-zinc-900 dark:text-zinc-50",
  STEM: "border-b-2 border-b-blue-400 text-zinc-900 dark:text-zinc-50",
  FITNESS: "border-b-2 border-b-emerald-400 text-zinc-900 dark:text-zinc-50",
};

export default function SubmissionsClient({ team, submissionsByCategory, readOnly = false }: Props) {
  const [activeCategory, setActiveCategory] = useState<Category>("STEM");
  const activeSub = submissionsByCategory[activeCategory] ?? null;

  return (
    <div className="flex flex-col gap-6">
      {readOnly && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
          You need to join or create a team before you can submit.{" "}
          <a href="/dashboard" className="font-semibold underline underline-offset-2">
            Go to Dashboard →
          </a>
        </div>
      )}

      {/* Team overview */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-4 text-xs font-semibold tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
          Team Overview — applies to all submissions
        </p>
        <TeamOverviewForm theme={team.theme} memo={team.memo} readOnly={readOnly} />
      </div>

      {/* Category tabs */}
      <div className="flex gap-0 border-b border-zinc-200 dark:border-zinc-800">
        {CATEGORIES.map((cat) => {
          const sub = submissionsByCategory[cat];
          const status = sub?.status ?? null;
          const isActive = cat === activeCategory;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors ${
                isActive
                  ? CATEGORY_ACTIVE[cat]
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {cat}
              {status ? (
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}
                >
                  {status}
                </span>
              ) : (
                <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active category form — key forces remount on tab switch to reset form state */}
      <div className={`rounded-xl border-t-4 border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ${CATEGORY_ACCENT[activeCategory]}`}>
        <SubmissionColumn
          key={activeCategory}
          category={activeCategory}
          submission={activeSub}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
