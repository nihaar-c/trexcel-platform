// Every field the student Info form collects, including the profile picture.
export const REQUIRED_PROFILE_FIELDS = [
  "first_name",
  "last_name",
  "phone",
  "gender",
  "race",
  "school_name",
  "student_id",
  "parent_first_name",
  "parent_last_name",
  "parent_email",
  "parent_phone",
  "address",
  "city",
  "state",
  "zip_code",
  "avatar_url",
] as const;

export type ProfileFields = Partial<
  Record<(typeof REQUIRED_PROFILE_FIELDS)[number], string | null>
>;

/** True only when every student_details field (incl. avatar) is filled in. */
export function isProfileComplete(details: ProfileFields | null | undefined): boolean {
  if (!details) return false;
  return REQUIRED_PROFILE_FIELDS.every((f) => !!details[f]?.trim());
}

// Literal (not built from the array) so supabase-js can infer the row type.
// tests/lib/profile.test.ts keeps it in sync with REQUIRED_PROFILE_FIELDS.
export const PROFILE_SELECT =
  "first_name, last_name, phone, gender, race, school_name, student_id, parent_first_name, parent_last_name, parent_email, parent_phone, address, city, state, zip_code, avatar_url";
