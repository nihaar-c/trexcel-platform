@AGENTS.md

# TrExcel 2027

Modern, low-cost student competition management platform. Built to scale for 20-30 team entries — not enterprise scale, so favor simple, direct solutions over premature abstraction.

## Tech Stack

- **Framework**: Next.js 16 (App Router), TypeScript
- **Styling**: Tailwind CSS
- **Hosting**: Vercel
- **Backend**: Supabase (Auth, PostgreSQL, Storage)
- **Auth pattern**: Cookie-based server-side auth via `@supabase/ssr`
- **Testing**: Vitest

## Critical Structural Constraints

- **No `src/` directory.** `app/`, `lib/`, `components/` live directly at the workspace root. Never create or suggest a `src/` layout.
- **Next.js 16 renamed Middleware → Proxy.** The route-protection file is `proxy.ts` at the project root (not `middleware.ts` — that convention no longer exists in this Next.js version). Same file-convention rules apply (single `proxy.ts`, exported `proxy` function, `config.matcher`).
- **RLS is mandatory on every table query path.** All three Supabase tables (`profiles`, `teams`, `submissions`) have Row Level Security enabled. Never write code that assumes RLS is off, and never suggest using the service-role key to bypass RLS from a client- or server-component context. Any new table added to the schema must ship with RLS policies in the same change.
- Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the public anon key) belong in `.env`. Never introduce the service-role key into app code, client bundles, or anything committed to git.

## Auth Architecture

Three separate Supabase client constructors, each for a distinct execution context — do not mix them up or reuse one where another belongs:

- `lib/supabase/client.ts` — `createBrowserClient`, for Client Components.
- `lib/supabase/server.ts` — `createServerClient` using `next/headers` cookies, for Server Components / Server Actions.
- `proxy.ts` — `createServerClient` using the request/response cookie API, for edge-level session refresh and route protection (currently redirects unauthenticated users away from `/dashboard`).

Login/signup logic lives in `app/login/actions.ts` as Server Actions (`login`, `signup`), called from the form in `app/login/page.tsx`. Session end-to-end: proxy refreshes the session cookie on every matched request → server components call `supabase.auth.getUser()` to read it → Server Actions mutate auth state directly against Supabase.

## Database Schema

- `public.profiles` — `id, email, phone, role, team_id`
- `public.teams` — `id, team_name, track, invite_code`
- `public.submissions` — `id, team_id, file_url, description, submitted_at`

RLS is enabled on all three. When adding queries, check the existing policies before assuming a query will succeed — a query that looks correct can silently return zero rows if it doesn't satisfy RLS.

## Directory Layout

```
app/              # App Router routes
  login/          # page.tsx + actions.ts (Server Actions)
  dashboard/       # protected route, gated by proxy.ts
lib/
  supabase/        # client.ts (browser), server.ts (server components/actions)
components/        # shared UI components (create as needed, root-level — no src/)
tests/             # unit tests, mirrors the source tree (e.g. tests/app/login/actions.test.ts)
proxy.ts           # route protection + session refresh (Next.js 16 "Proxy" convention)
```

## Current Status

- App scaffolded: TypeScript, Tailwind, App Router, no `src/`.
- Supabase project linked; env vars in `.env`.
- Both Supabase client helpers implemented.
- `proxy.ts` protects `/dashboard`, redirecting unauthenticated users to `/login`.
- Login/signup Server Actions and login page implemented.
- Dashboard page reads the authenticated user server-side and provides logout.
- Base schema (`profiles`, `teams`, `submissions`) live in Supabase with RLS enabled.

## Commands

- `npm run dev` / `build` / `start` — Next.js lifecycle
- `npm run lint` — ESLint
- `npm run test` — Vitest
