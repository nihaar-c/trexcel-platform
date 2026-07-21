"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { setViewAs, clearViewAs } from "@/app/view-as-actions";

export default function AdminViewSwitcher() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewAs, setViewAsState] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role === "admin") setIsAdmin(true);
    });

    const match = document.cookie.match(/trexcel-view-as=([^;]+)/);
    setViewAsState(match?.[1] ?? null);
  }, [pathname]);

  if (!isAdmin) return null;

  const onAdminRoute = pathname.startsWith("/admin");
  const inPreview =
    viewAs !== null &&
    !onAdminRoute &&
    (pathname.startsWith("/dashboard") || pathname.startsWith("/judge"));

  if (inPreview) {
    const label = viewAs === "judge" ? "judge" : "student";
    return (
      <div className="ml-auto flex items-center gap-2">
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          Viewing as {label}
        </span>
        <button
          type="button"
          onClick={async () => {
            await clearViewAs();
            setViewAsState(null);
            router.push("/admin");
          }}
          className="rounded-md bg-brand-dark px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-85 dark:bg-brand-gold dark:text-zinc-900"
        >
          Admin
        </button>
      </div>
    );
  }

  if (onAdminRoute) {
    return (
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={async () => {
            await setViewAs("student");
            setViewAsState("student");
            router.push("/dashboard");
          }}
          className="rounded-md bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
        >
          View As Student
        </button>
        <button
          type="button"
          onClick={async () => {
            await setViewAs("judge");
            setViewAsState("judge");
            router.push("/judge");
          }}
          className="rounded-md bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
        >
          View As Judge
        </button>
      </div>
    );
  }

  // Admin is logged in but not on an admin route — show persistent Admin link
  return (
    <Link
      href="/admin"
      className="ml-auto rounded-md bg-brand-dark px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-85 dark:bg-brand-gold dark:text-zinc-900"
    >
      Admin
    </Link>
  );
}
