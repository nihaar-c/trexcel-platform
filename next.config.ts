import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js needs 'unsafe-inline' for its inline styles; nonce-based CSP requires build changes
      "style-src 'self' 'unsafe-inline'",
      // Next.js hydration requires 'unsafe-inline' for its inline scripts in older builds;
      // script-src covers that plus our own JS bundles
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      // Supabase API + auth endpoints
      `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://*.supabase.co"} wss://*.supabase.co`,
      // Avatar images served from Supabase Storage
      `img-src 'self' data: ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://*.supabase.co"}`,
      "font-src 'self'",
      // Submission links open in a new tab — allow them to navigate out but not embed us
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
