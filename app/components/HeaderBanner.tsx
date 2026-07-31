"use client";

import { usePathname } from "next/navigation";

const headerImageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site/logo-header.jpg`;

export default function HeaderBanner() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={headerImageUrl}
      alt="TrExcel 2026-2027"
      className="w-full object-cover object-[center_70%]"
      style={{ maxHeight: "440px" }}
    />
  );
}
