import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/dashboard";
  // Reject anything that isn't a plain relative path to prevent open-redirect
  // abuse via crafted email links (e.g. next=//evil.com).
  const next = /^\/[^/]/.test(nextRaw) ? nextRaw : "/dashboard";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    // After exchanging the code the session is established. For signup
    // confirmation flows the profile insert may have failed (no session at
    // call time), so upsert here to guarantee a row exists.
    if (next !== "/auth/update-password") {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .upsert(
            { id: user.id, email: user.email, role: "student" },
            { onConflict: "id", ignoreDuplicates: true },
          );
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
