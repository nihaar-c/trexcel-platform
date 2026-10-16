import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  judge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  mentor: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  student: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
        {value || <span className="text-zinc-400 dark:text-zinc-600">—</span>}
      </dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold tracking-widest text-zinc-500 uppercase dark:text-zinc-400">
        {title}
      </h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        {children}
      </dl>
    </div>
  );
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: profile }, { data: details }, { data: waiver }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, first_name, last_name, role, team_id, teams(team_name)")
      .eq("id", id)
      .single(),
    supabase
      .from("student_details")
      .select("*")
      .eq("user_id", id)
      .maybeSingle(),
    supabase
      .from("waivers")
      .select("*")
      .eq("user_id", id)
      .maybeSingle(),
  ]);

  if (!profile) notFound();

  const role = profile.role ?? "student";
  const team = profile.teams as { team_name: string } | null;
  const name =
    profile.first_name || profile.last_name
      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
      : profile.email ?? id;

  const waiverComplete = !!waiver?.completed_at;
  const profileComplete = !!details?.first_name;

  return (
    <div className="max-w-3xl">
      {/* Back */}
      <Link
        href="/admin/users"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
            clipRule="evenodd"
          />
        </svg>
        All Users
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-lg font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {(profile.first_name?.[0] ?? profile.email?.[0] ?? "?").toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {name}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ROLE_STYLES[role] ?? ROLE_STYLES.student}`}
            >
              {role}
            </span>
            {team && (
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {team.team_name}
              </span>
            )}
          </div>
        </div>

        {/* Completion badges */}
        <div className="ml-auto flex gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              profileComplete
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${profileComplete ? "bg-green-500" : "bg-zinc-400"}`}
            />
            Profile {profileComplete ? "complete" : "incomplete"}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              waiverComplete
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${waiverComplete ? "bg-green-500" : "bg-zinc-400"}`}
            />
            Waiver {waiverComplete ? "complete" : "incomplete"}
          </span>
        </div>
      </div>

      <div className="space-y-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        {/* Account */}
        <Section title="Account">
          <Field label="Email" value={profile.email} />
          <Field label="Role" value={role} />
          <Field label="Team" value={team?.team_name} />
        </Section>

        <hr className="border-zinc-100 dark:border-zinc-800" />

        {/* Personal info */}
        <Section title="Personal Info">
          <Field label="First Name" value={details?.first_name ?? profile.first_name} />
          <Field label="Last Name" value={details?.last_name ?? profile.last_name} />
          <Field label="Phone" value={details?.phone} />
          <Field label="Gender" value={details?.gender} />
          <Field label="Race / Ethnicity" value={details?.race} />
        </Section>

        <hr className="border-zinc-100 dark:border-zinc-800" />

        {/* School */}
        <Section title="School">
          <Field label="School Name" value={details?.school_name} />
          <Field label="Student ID" value={details?.student_id} />
        </Section>

        <hr className="border-zinc-100 dark:border-zinc-800" />

        {/* Address */}
        <Section title="Address">
          <Field label="Street" value={details?.address} />
          <Field label="City" value={details?.city} />
          <Field label="State" value={details?.state} />
          <Field label="Zip Code" value={details?.zip_code} />
        </Section>

        <hr className="border-zinc-100 dark:border-zinc-800" />

        {/* Parent / Guardian */}
        <Section title="Parent / Guardian">
          <Field
            label="Name"
            value={
              details?.parent_first_name || details?.parent_last_name
                ? `${details.parent_first_name ?? ""} ${details.parent_last_name ?? ""}`.trim()
                : null
            }
          />
          <Field label="Email" value={details?.parent_email} />
          <Field label="Phone" value={details?.parent_phone} />
        </Section>

        <hr className="border-zinc-100 dark:border-zinc-800" />

        {/* Waiver */}
        <Section title="Waiver">
          <Field
            label="Status"
            value={waiverComplete ? `Completed ${new Date(waiver!.completed_at!).toLocaleDateString()}` : "Not completed"}
          />
          <Field label="Student Signature" value={waiver?.student_signature} />
          <Field label="Parent Signature" value={waiver?.parent_signature} />
          <Field label="Signed Date" value={waiver?.signed_date} />
          <Field
            label="Media Consent"
            value={
              waiver
                ? waiver.media_consent
                  ? "Yes"
                  : "No"
                : undefined
            }
          />
          {waiver?.file_url && (
            <div>
              <dt className="text-xs font-medium tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                Uploaded Copy
              </dt>
              <dd className="mt-1 text-sm">
                <a
                  href={waiver.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-dark underline underline-offset-2 hover:opacity-75 dark:text-brand-gold"
                >
                  View file
                </a>
              </dd>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
