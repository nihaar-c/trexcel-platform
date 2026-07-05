"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveStudentInfo } from "./actions";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const GENDER_PRESETS = [
  "Female",
  "Male",
  "Non-binary",
  "Prefer not to say",
] as const;

const RACE_OPTIONS = [
  "American Indian or Alaska Native",
  "Asian",
  "Black or African American",
  "Latin Descent",
  "Middle Eastern and/or Asian",
  "Native Hawaiian and/or other Pacific Islander",
  "Middle Eastern and North African",
  "White",
  "Two or more races",
  "Prefer not to say",
] as const;

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

function isPresetGender(g: string | null): g is (typeof GENDER_PRESETS)[number] {
  return GENDER_PRESETS.includes(g as (typeof GENDER_PRESETS)[number]);
}

const supabase = createClient();

type Props = { details: StudentDetails; userId: string };

export default function ProfileForm({ details, userId }: Props) {

  const storedGender = details?.gender ?? null;
  const [genderOption, setGenderOption] = useState<string>(
    isPresetGender(storedGender) ? storedGender : storedGender ? "Other" : "",
  );
  const [genderOther, setGenderOther] = useState(
    storedGender && !isPresetGender(storedGender) ? storedGender : "",
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    details?.avatar_url ?? null,
  );
  const [state, setState] = useState<{ error?: string; success?: boolean } | null>(null);
  const [pending, setPending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState(null);
    setPending(true);

    const formData = new FormData(e.currentTarget);
    let avatarUrl = details?.avatar_url ?? null;

    const file = fileInputRef.current?.files?.[0];
    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setState({ error: "Avatar must be a JPEG, PNG, or WebP image." });
        setPending(false);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setState({ error: "Avatar must be under 5 MB." });
        setPending(false);
        return;
      }

      const ext = file.type.split("/")[1];
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        setState({ error: uploadError.message });
        setPending(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      avatarUrl = publicUrl;
    }

    formData.set("existing_avatar_url", avatarUrl ?? "");
    formData.delete("avatar");

    const result = await saveStudentInfo(null, formData);
    setState(result);
    setPending(false);
  }

  const inputCls =
    "rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";
  const labelCls = "text-sm font-medium text-zinc-700 dark:text-zinc-300";
  const sectionCls = "border-t border-zinc-100 pt-6 dark:border-zinc-800";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6">
      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
          Information saved.
        </p>
      )}

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          name="avatar"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group relative h-20 w-20 overflow-hidden rounded-full border-2 border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
        >
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Profile"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xl font-semibold text-zinc-400 dark:text-zinc-500">
              {details?.first_name?.[0]?.toUpperCase() ?? "?"}
            </span>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="text-xs font-medium text-white">Change</span>
          </div>
        </button>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          JPEG, PNG, or WebP · max 5 MB
        </p>
      </div>

      {/* Personal */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className={labelCls}>First name</label>
            <input
              name="first_name"
              type="text"
              defaultValue={details?.first_name ?? ""}
              required
              className={inputCls}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className={labelCls}>Last name</label>
            <input
              name="last_name"
              type="text"
              defaultValue={details?.last_name ?? ""}
              required
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>
            Phone <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <input
            name="phone"
            type="tel"
            defaultValue={details?.phone ?? ""}
            className={inputCls}
          />
        </div>

        {/* Gender */}
        <div className="flex flex-col gap-2">
          <span className={labelCls}>Gender</span>
          <div className="flex flex-col gap-1.5">
            {GENDER_PRESETS.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <input
                  type="radio"
                  name="gender_option"
                  value={opt}
                  checked={genderOption === opt}
                  onChange={() => setGenderOption(opt)}
                  className="accent-zinc-900 dark:accent-zinc-50"
                />
                {opt}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <input
                type="radio"
                name="gender_option"
                value="Other"
                checked={genderOption === "Other"}
                onChange={() => setGenderOption("Other")}
                className="accent-zinc-900 dark:accent-zinc-50"
              />
              Other
            </label>
            {genderOption === "Other" && (
              <input
                name="gender_other"
                type="text"
                placeholder="Please specify"
                value={genderOther}
                onChange={(e) => setGenderOther(e.target.value)}
                className={`ml-6 ${inputCls}`}
              />
            )}
          </div>
        </div>

        {/* Race */}
        <div className="flex flex-col gap-2">
          <span className={labelCls}>Race</span>
          <div className="flex flex-col gap-1.5">
            {RACE_OPTIONS.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <input
                  type="radio"
                  name="race"
                  value={opt}
                  defaultChecked={details?.race === opt}
                  className="accent-zinc-900 dark:accent-zinc-50"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Parent / Guardian */}
      <div className={`${sectionCls} flex flex-col gap-4`}>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Parent / Guardian
        </p>
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className={labelCls}>First name</label>
            <input name="parent_first_name" type="text" defaultValue={details?.parent_first_name ?? ""} className={inputCls} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className={labelCls}>Last name</label>
            <input name="parent_last_name" type="text" defaultValue={details?.parent_last_name ?? ""} className={inputCls} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Email</label>
          <input name="parent_email" type="email" defaultValue={details?.parent_email ?? ""} className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Phone</label>
          <input name="parent_phone" type="tel" defaultValue={details?.parent_phone ?? ""} className={inputCls} />
        </div>
      </div>

      {/* Address */}
      <div className={`${sectionCls} flex flex-col gap-4`}>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Address
        </p>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Street address</label>
          <input name="address" type="text" defaultValue={details?.address ?? ""} className={inputCls} />
        </div>
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className={labelCls}>City</label>
            <input name="city" type="text" defaultValue={details?.city ?? ""} className={inputCls} />
          </div>
          <div className="flex w-24 flex-col gap-1.5">
            <label className={labelCls}>State</label>
            <input name="state" type="text" defaultValue={details?.state ?? ""} maxLength={2} placeholder="TX" className={`uppercase ${inputCls}`} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelCls}>Zip code</label>
          <input name="zip_code" type="text" defaultValue={details?.zip_code ?? ""} maxLength={10} className={inputCls} />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
