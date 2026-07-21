"use client";

import { useActionState } from "react";
import { upsertSubmission } from "../actions";

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

type Props = {
  category: string;
  submission: Submission;
  readOnly?: boolean;
};

const STATUS_STYLES: Record<string, string> = {
  submitted:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  reviewed:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  draft: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

const FIELDS = [
  {
    name: "title",
    label: "Title*",
    type: "input",
    placeholder: "Project title (max 250 chars)",
    maxLength: 250,
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    placeholder: "Describe your project…",
  },
  {
    name: "ai_description",
    label: "How AI was used",
    type: "textarea",
    placeholder: "Describe any AI tools or assistance used…",
  },
  {
    name: "help_received",
    label: "Help received",
    type: "textarea",
    placeholder: "Describe any external help or resources used…",
  },
  {
    name: "file_url",
    label: "File / submission link",
    type: "input",
    placeholder: "https://drive.google.com/…",
  },
] as const;

export default function SubmissionColumn({ category, submission, readOnly = false }: Props) {
  const [state, formAction, isPending] = useActionState(upsertSubmission, null);
  const status = submission?.status ?? null;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
        <h2 className="text-base font-bold tracking-wide text-zinc-900 dark:text-zinc-50">
          {category}
        </h2>
        {status ? (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}
          >
            {status}
          </span>
        ) : (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            Not started
          </span>
        )}
      </div>

      {/* Form */}
      <form action={formAction} className="flex flex-col gap-5 p-6">
        <input type="hidden" name="category" value={category} />

        {FIELDS.filter(
          (f) =>
            category !== "FITNESS" ||
            (f.name !== "ai_description" && f.name !== "help_received"),
        ).map((f) => {
          const defaultValue =
            f.name === "file_url"
              ? (submission?.file_url ?? "")
              : (submission?.[f.name as keyof typeof submission] as string | null) ?? "";

          return (
            <div key={f.name} className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                {f.label}
              </label>
              {f.type === "textarea" ? (
                <textarea
                  name={f.name}
                  defaultValue={defaultValue}
                  rows={3}
                  placeholder={f.placeholder}
                  disabled={readOnly}
                  className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-dark disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:bg-zinc-800"
                />
              ) : (
                <input
                  name={f.name}
                  type={f.name === "file_url" ? "url" : "text"}
                  defaultValue={defaultValue}
                  placeholder={f.placeholder}
                  maxLength={"maxLength" in f ? f.maxLength : undefined}
                  disabled={readOnly}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-dark disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:bg-zinc-800"
                />
              )}
            </div>
          );
        })}

        {state?.error && (
          <p className="text-xs text-red-500">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-xs text-green-600 dark:text-green-400">
            Saved successfully.
          </p>
        )}

        {!readOnly && (
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              name="status"
              value="draft"
              disabled={isPending}
              className="flex-1 rounded-lg border border-zinc-200 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Save draft
            </button>
            <button
              type="submit"
              name="status"
              value="submitted"
              disabled={isPending}
              className="flex-1 rounded-lg bg-brand-dark py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Submit"}
            </button>
          </div>
        )}

        {submission?.file_url && (
          <a
            href={submission.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-xs text-zinc-400 underline underline-offset-2 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            View current file →
          </a>
        )}
      </form>
    </div>
  );
}
