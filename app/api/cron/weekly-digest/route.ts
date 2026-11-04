import { createClient } from "@/lib/supabase/server";
import { notifyOrganizers, esc } from "@/lib/notifications";

type DigestRow = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  school_name: string | null;
  created_at: string;
};

const DAYS = 7;

// Called weekly by Vercel Cron (see vercel.json), which sends
// `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();

  // No user session here and the service-role key is off limits, so the
  // secret-guarded SECURITY DEFINER function is the only way past RLS.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("weekly_profile_digest", {
    p_secret: secret,
    p_since: since,
  });
  if (error) {
    console.error("Weekly digest query failed:", error);
    return new Response("Query failed", { status: 500 });
  }

  const rows = (data ?? []) as DigestRow[];
  if (rows.length === 0) return Response.json({ sent: false, count: 0 });

  const body = rows
    .map((r) => {
      const name = `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "Unknown";
      return `<tr><td>${esc(name)}</td><td>${esc(r.email)}</td><td>${esc(r.school_name)}</td></tr>`;
    })
    .join("");

  const sent = await notifyOrganizers(
    `Weekly digest: ${rows.length} new student profile${rows.length === 1 ? "" : "s"}`,
    `
      <h2>New Student Profiles (last ${DAYS} days)</h2>
      <table cellpadding="6" border="1" style="border-collapse:collapse">
        <tr><th align="left">Name</th><th align="left">Email</th><th align="left">School</th></tr>
        ${body}
      </table>
    `,
  );

  return Response.json({ sent, count: rows.length }, { status: sent ? 200 : 502 });
}
