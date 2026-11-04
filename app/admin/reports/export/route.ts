import { createClient } from "@/lib/supabase/server";
import { buildReport, loadReportRows, parseReportConfig, toCsv } from "@/lib/reports";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return new Response("Forbidden", { status: 403 });

  const url = new URL(request.url);
  const params: Record<string, string[]> = {};
  for (const k of new Set(url.searchParams.keys())) params[k] = url.searchParams.getAll(k);

  const config = parseReportConfig(params);
  if (config.fields.length === 0) return new Response("Select at least one field", { status: 400 });

  const csv = toCsv(buildReport(await loadReportRows(supabase), config.groupBy), config);
  const name = params.preset?.[0] === "teams" ? "team-report" : "custom-report";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
