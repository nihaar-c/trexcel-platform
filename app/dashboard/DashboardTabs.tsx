"use client";

import { useState } from "react";
import TeamSetup from "./TeamSetup";
import ProfileForm from "./ProfileForm";

type Profile = { role: string | null; team_id: string | null } | null;

type Team = {
  team_name: string;
  invite_code: string | null;
  count: number | null;
} | null;

type StudentDetails = {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  gender: string | null;
  race: string | null;
  parent_first_name: string | null;
  parent_last_name: string | null;
  parent_email: string | null;
  parent_phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  avatar_url: string | null;
} | null;

type Props = {
  email: string;
  userId: string;
  profile: Profile;
  team: Team;
  studentDetails: StudentDetails;
};

type Tab = "overview" | "team" | "profile";

const STUDENT_TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "team", label: "Team" },
  { id: "profile", label: "Info" },
];

export default function DashboardTabs({
  email,
  userId,
  profile,
  team,
  studentDetails,
}: Props) {
  const isStudent = !profile?.role || profile.role === "student";
  const [tab, setTab] = useState<Tab>(isStudent ? "team" : "overview");

  const firstName = studentDetails?.first_name ?? null;

  return (
    <main className="flex w-full max-w-md flex-col rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-1 text-sm font-medium tracking-widest text-zinc-500 uppercase dark:text-zinc-400">
        TrExcel 2027
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{email}</p>

      {isStudent ? (
        <>
          <div className="mt-6 flex rounded-lg border border-zinc-200 p-1 dark:border-zinc-700">
            {STUDENT_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                  tab === id
                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {tab === "overview" && (
              <p className="text-sm text-zinc-400 dark:text-zinc-500">
                More features coming soon.
              </p>
            )}

            {tab === "team" && (
              <>
                {team ? (
                  <div className="flex flex-col gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                        {team.team_name}
                      </h2>
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                        {team.count ?? 1} / 3 members
                      </p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-950">
                      <p className="text-xs font-medium tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                        Invite code
                      </p>
                      <p className="mt-1 font-mono text-2xl font-semibold tracking-widest text-zinc-900 dark:text-zinc-50">
                        {team.invite_code}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                        Share this with your teammates
                      </p>
                    </div>
                  </div>
                ) : (
                  <TeamSetup />
                )}
              </>
            )}

            {tab === "profile" && (
              <ProfileForm details={studentDetails} userId={userId} />
            )}
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          Role:{" "}
          <span className="font-medium capitalize text-zinc-700 dark:text-zinc-300">
            {profile?.role}
          </span>
        </p>
      )}

    </main>
  );
}
