"use client";

import { useState } from "react";

type Member = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  school_name: string | null;
  avatar_url: string | null;
};

type Submission = {
  id: string;
  description: string | null;
  file_url: string | null;
  submitted_at: string;
  category: string | null;
  status: string | null;
} | null;

type Score = {
  criterion_name: string;
  category_name: string;
  judge_email: string | null;
  score: number;
  max_score: number;
};

type Props = {
  members: Member[];
  submission: Submission;
  scores: Score[];
};

type Tab = "members" | "submission" | "scores";

const TABS: { id: Tab; label: string }[] = [
  { id: "members", label: "Members" },
  { id: "submission", label: "Submission" },
  { id: "scores", label: "Scores" },
];

const ROLE_STYLES: Record<string, string> = {
  mentor:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  student: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

const STATUS_STYLES: Record<string, string> = {
  submitted:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  reviewed:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  draft: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

export default function TeamDetailTabs({ members, submission, scores }: Props) {
  const [tab, setTab] = useState<Tab>("members");

  return (
    <div>
      <div className="flex gap-1 rounded-lg border border-zinc-200 p-1 dark:border-zinc-700 w-fit">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === id
                ? "bg-brand-dark text-white"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "members" && (
          <div className="flex flex-col divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {members.map((m) => {
              const role = m.role ?? "student";
              const name =
                m.first_name || m.last_name
                  ? `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim()
                  : m.email ?? "Unknown";
              return (
                <div key={m.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                    {m.avatar_url ? (
                      <img
                        src={m.avatar_url}
                        alt={name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                        {name[0]?.toUpperCase() ?? "?"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-zinc-50 truncate">
                      {name}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                      {m.school_name ?? m.email ?? "—"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ROLE_STYLES[role] ?? ROLE_STYLES.student}`}
                  >
                    {role}
                  </span>
                </div>
              );
            })}
            {members.length === 0 && (
              <p className="px-5 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                No members yet.
              </p>
            )}
          </div>
        )}

        {tab === "submission" && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            {submission ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                      Category
                    </p>
                    <p className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-50">
                      {submission.category ?? "—"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[submission.status ?? "draft"] ?? STATUS_STYLES.draft}`}
                  >
                    {submission.status ?? "draft"}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                    Description
                  </p>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {submission.description ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                    Submitted
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                    {new Date(submission.submitted_at).toLocaleString()}
                  </p>
                </div>
                {submission.file_url && (
                  <a
                    href={submission.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    View file →
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No submission yet.
              </p>
            )}
          </div>
        )}

        {tab === "scores" && (
          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
            {scores.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                      Judge
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                      Criterion
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {scores.map((s, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {s.judge_email ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {s.category_name}
                      </td>
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-50">
                        {s.criterion_name}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-zinc-50">
                        {s.score} / {s.max_score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-5 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                No scores yet.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
