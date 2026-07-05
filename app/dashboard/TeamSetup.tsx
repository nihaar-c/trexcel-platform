"use client";

import { useState, useActionState } from "react";
import { createTeam, joinTeam } from "./actions";

export default function TeamSetup() {
  const [tab, setTab] = useState<"create" | "join">("create");
  const [createState, createAction, createPending] = useActionState(
    createTeam,
    null,
  );
  const [joinState, joinAction, joinPending] = useActionState(joinTeam, null);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Set up your team
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Create a new team or join one with an invite code.
        </p>
      </div>

      <div className="flex rounded-lg border border-zinc-200 p-1 dark:border-zinc-700">
        <button
          type="button"
          onClick={() => setTab("create")}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
            tab === "create"
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          }`}
        >
          Create a team
        </button>
        <button
          type="button"
          onClick={() => setTab("join")}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
            tab === "join"
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          }`}
        >
          Join a team
        </button>
      </div>

      {tab === "create" && (
        <form action={createAction} className="flex flex-col gap-4">
          {createState?.error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              {createState.error}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Team name
            </label>
            <input
              name="team_name"
              type="text"
              placeholder="e.g. Team Rocket"
              required
              className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
            />
          </div>
          <button
            type="submit"
            disabled={createPending}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {createPending ? "Creating…" : "Create team"}
          </button>
        </form>
      )}

      {tab === "join" && (
        <form action={joinAction} className="flex flex-col gap-4">
          {joinState?.error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              {joinState.error}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Invite code
            </label>
            <input
              name="invite_code"
              type="text"
              placeholder="A1B2C3"
              maxLength={6}
              required
              className="rounded-md border border-zinc-200 bg-white px-3 py-2 font-mono text-sm uppercase tracking-widest outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
            />
          </div>
          <button
            type="submit"
            disabled={joinPending}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {joinPending ? "Joining…" : "Join team"}
          </button>
        </form>
      )}
    </div>
  );
}
