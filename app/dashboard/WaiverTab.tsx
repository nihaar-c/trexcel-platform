"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveWaiver } from "./actions";

type Waiver = {
  student_full_name: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  parent_signature: string | null;
  student_signature: string | null;
  signed_date: string | null;
  media_consent: boolean | null;
  agreed: boolean | null;
  file_url: string | null;
  completed_at: string | null;
} | null;

type Props = { waiver: Waiver; userId: string };

const supabase = createClient();

export default function WaiverTab({ waiver, userId }: Props) {
  const [state, setState] = useState<{ error?: string; success?: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isComplete = !!waiver?.completed_at;

  function handleDownload() {
    const { data } = supabase.storage
      .from("site")
      .getPublicUrl("trexcel_waiver.pdf", { download: "trexcel_waiver.pdf" });
    window.open(data.publicUrl, "_blank", "noopener,noreferrer");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState(null);
    setPending(true);

    const formData = new FormData(e.currentTarget);

    // Upload path: if a file was chosen, push it to the private waivers bucket
    // and record its path. Existing uploaded copy is preserved otherwise.
    let fileUrl = waiver?.file_url ?? null;
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        setState({ error: "Signed waiver must be a PDF." });
        setPending(false);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setState({ error: "Signed waiver must be under 10 MB." });
        setPending(false);
        return;
      }

      const path = `${userId}/waiver.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("waivers")
        .upload(path, file, { upsert: true, contentType: "application/pdf" });

      if (uploadError) {
        setState({ error: uploadError.message });
        setPending(false);
        return;
      }
      fileUrl = path;
    }

    formData.set("file_url", fileUrl ?? "");
    formData.delete("signed_pdf");

    const result = await saveWaiver(null, formData);
    setState(result);
    setPending(false);
  }

  const inputCls =
    "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";
  const labelCls = "text-sm font-medium text-zinc-700 dark:text-zinc-300";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Participant Waiver
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Every student must complete this consent waiver before submitting a project.
          Download it to sign by hand, or fill it out below.
        </p>
      </div>

      {isComplete && (
        <div
          role="status"
          className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
        >
          Your waiver is complete. You can update it below if needed.
        </div>
      )}

      {/* Download blank PDF */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-4 dark:border-zinc-700 dark:bg-zinc-950">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Download the waiver
        </p>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Print, sign, and upload the completed copy below — or fill it out on screen.
        </p>
        <button
          type="button"
          onClick={handleDownload}
          className="mt-3 inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Download waiver PDF
        </button>
      </div>

      {state?.error && (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
        >
          {state.error}
        </div>
      )}
      {state?.success && (
        <div
          role="status"
          className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
        >
          Your waiver has been saved.
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Fill on screen */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
            Fill it out on screen
          </p>

          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Participant (student) full name</span>
            <input
              name="student_full_name"
              type="text"
              defaultValue={waiver?.student_full_name ?? ""}
              className={inputCls}
            />
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className={labelCls}>Parent / guardian name</span>
              <input
                name="parent_name"
                type="text"
                defaultValue={waiver?.parent_name ?? ""}
                className={inputCls}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className={labelCls}>Parent / guardian phone</span>
              <input
                name="parent_phone"
                type="tel"
                autoComplete="tel"
                defaultValue={waiver?.parent_phone ?? ""}
                className={inputCls}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>Parent / guardian email</span>
            <input
              name="parent_email"
              type="email"
              autoComplete="email"
              defaultValue={waiver?.parent_email ?? ""}
              className={inputCls}
            />
          </label>

          <label className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              name="media_consent"
              defaultChecked={waiver?.media_consent ?? false}
              className="mt-0.5 accent-zinc-900 dark:accent-zinc-50"
            />
            I give permission for my child&apos;s photo/video to be used for
            promotional and nonprofit-related purposes (Media Release).
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className={labelCls}>Parent / guardian signature (type name)</span>
              <input
                name="parent_signature"
                type="text"
                autoComplete="off"
                defaultValue={waiver?.parent_signature ?? ""}
                className={inputCls}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className={labelCls}>Student signature (type name)</span>
              <input
                name="student_signature"
                type="text"
                autoComplete="off"
                defaultValue={waiver?.student_signature ?? ""}
                className={inputCls}
              />
            </label>
          </div>

          <label className="flex w-48 flex-col gap-1.5">
            <span className={labelCls}>Date</span>
            <input
              name="signed_date"
              type="date"
              autoComplete="off"
              defaultValue={waiver?.signed_date ?? ""}
              className={inputCls}
            />
          </label>

          <label className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              name="agreed"
              defaultChecked={waiver?.agreed ?? false}
              className="mt-0.5 accent-zinc-900 dark:accent-zinc-50"
            />
            I have read and agree to the waiver, release of liability, and consent
            terms described in the TrExcel Participant Waiver.
          </label>
        </div>

        {/* Upload signed copy */}
        <div className="flex flex-col gap-2 border-t border-zinc-100 pt-5 dark:border-zinc-800">
          <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
            Or upload a signed copy
          </p>
          <input
            ref={fileInputRef}
            type="file"
            name="signed_pdf"
            accept="application/pdf"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            className="block text-sm text-zinc-600 file:mr-3 file:rounded-md file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-100 dark:text-zinc-400 dark:file:border-zinc-700 dark:file:bg-zinc-900 dark:file:text-zinc-300"
          />
          {(fileName || waiver?.file_url) && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {fileName ? `Selected: ${fileName}` : "A signed copy is already on file."}
            </p>
          )}
          <p className="text-xs text-zinc-400 dark:text-zinc-500">PDF · max 10 MB</p>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-md bg-brand-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark-hover disabled:opacity-50"
        >
          {pending ? "Saving…" : "Submit Waiver"}
        </button>
      </form>
    </div>
  );
}
