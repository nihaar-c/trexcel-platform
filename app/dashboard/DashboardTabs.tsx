"use client";

import { useState } from "react";
import Link from "next/link";
import TeamSetup from "./TeamSetup";
import ProfileForm from "./ProfileForm";
import CompetitionOverview from "./CompetitionOverview";

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
  school_name: string | null;
  student_id: string | null;
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

type StudentTab = "overview" | "team" | "profile";
type MentorTab = "overview" | "team";

const STUDENT_TABS: { id: StudentTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "team", label: "Team" },
  { id: "profile", label: "Info" },
];

const MENTOR_TABS: { id: MentorTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "team", label: "Team" },
];

function TeamView({ team, readOnly }: { team: Team; readOnly: boolean }) {
  if (!team) {
    return readOnly ? (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">No team yet.</p>
    ) : (
      <TeamSetup />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {team.team_name}
        </h2>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {team.count ?? 1} / 4 members
        </p>
      </div>
      {!readOnly && (
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
      )}
    </div>
  );
}

export default function DashboardTabs({
  email,
  userId,
  profile,
  team,
  studentDetails,
}: Props) {
  const role = profile?.role ?? "student";
  const isStudent = role === "student" || !profile?.role;
  const isMentor = role === "mentor";

  const [studentTab, setStudentTab] = useState<StudentTab>("team");
  const [mentorTab, setMentorTab] = useState<MentorTab>("team");

  const firstName = studentDetails?.first_name ?? null;

  const tabClass = (active: boolean) =>
    `flex-1 rounded-md py-1.5 text-sm font-medium text-center transition-colors ${
      active
        ? "bg-brand-dark text-white"
        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
    }`;

  return (
    <main className="flex w-full max-w-2xl flex-col rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-1 text-sm font-medium tracking-widest text-brand-dark uppercase dark:text-brand-gold">
        TrExcel 2027
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
      </h1>
      <div className="mt-1 flex items-center gap-2">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{email}</p>
        {isMentor && (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            Mentor
          </span>
        )}
      </div>

      {isStudent && (
        <>
          <div className="mt-6 flex rounded-lg border border-zinc-200 p-1 dark:border-zinc-700">
            {STUDENT_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setStudentTab(id)}
                className={tabClass(studentTab === id)}
              >
                {label}
              </button>
            ))}
            <Link href="/dashboard/submissions" className={tabClass(false)}>
              Submissions
            </Link>
          </div>

          <div className="mt-6">
            {studentTab === "overview" && <CompetitionOverview />}
            {studentTab === "team" && <TeamView team={team} readOnly={false} />}
            {studentTab === "profile" && (
              <ProfileForm details={studentDetails} userId={userId} />
            )}
          </div>
        </>
      )}

      {isMentor && (
        <>
          <div className="mt-6 flex rounded-lg border border-zinc-200 p-1 dark:border-zinc-700">
            {MENTOR_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMentorTab(id)}
                className={tabClass(mentorTab === id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-6">
            {mentorTab === "overview" && <CompetitionOverview />}
            {mentorTab === "team" && <TeamView team={team} readOnly={true} />}
          </div>
        </>
      )}

      {!isStudent && !isMentor && (
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
