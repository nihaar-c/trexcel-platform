import { Resend } from "resend";

/** Organizer recipients. Set NOTIFY_EMAILS (comma-separated) to override without a code change. */
const NOTIFY_EMAILS = [
  "nchowdhury101@gmail.com",
  "ayeshach@yahoo.com",
  "nihaar.char@gmail.com",
];

/** Sender on the verified Resend domain. Override with NOTIFY_FROM. */
const DEFAULT_FROM = "TrExcel <notifications@empowerexcel.org>";

export function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function recipients(): string[] {
  const fromEnv = (process.env.NOTIFY_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : NOTIFY_EMAILS;
}

/**
 * Emails the organizers. Best-effort: a failed notification must never fail the
 * user's action, so errors are logged and swallowed.
 */
export async function notifyOrganizers(subject: string, html: string): Promise<boolean> {
  try {
    const to = recipients();
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.NOTIFY_FROM?.trim() || DEFAULT_FROM,
      to,
      subject,
      html,
    });
    if (error) {
      console.error("Organizer notification failed:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Organizer notification failed:", err);
    return false;
  }
}
