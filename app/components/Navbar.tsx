"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/app/auth-actions";

const authedLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/account", label: "Account" },
];

const linkCls = (active: boolean) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    active
      ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
  }`;

export default function Navbar() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <nav className="flex items-center gap-2 border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="mr-2 text-sm font-semibold tracking-widest text-zinc-500 uppercase dark:text-zinc-400">
        TrExcel
      </span>

      <Link href="/" className={linkCls(pathname === "/")}>
        Home
      </Link>

      {isLoggedIn === true && (
        <>
          {authedLinks.map(({ href, label }) => (
            <Link key={href} href={href} className={linkCls(pathname === href)}>
              {label}
            </Link>
          ))}
          <form action={logout} className="ml-auto">
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Log out
            </button>
          </form>
        </>
      )}

      {isLoggedIn === false && (
        <Link href="/login" className={`ml-auto ${linkCls(pathname === "/login")}`}>
          Log in
        </Link>
      )}
    </nav>
  );
}
