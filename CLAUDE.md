@AGENTS.md
# TrExcel 2027

Modern, low-cost student competition management platform. Built to scale for 20–30 team entries — not enterprise scale, so favor simple, direct solutions over premature abstraction.

## Domain Context & Competition Overview

TrExcel is an annual high school student competition organized under the nonprofit umbrella (EmpowerExcel). The platform replaces clunky legacy systems (like zFairs) with a streamlined, modern portal for student registration, project submission, and judge scoring.

### Target Scale & Users
- **Scale:** 20–30 team entries total (~60–90 active students).
- **Team Size:** Up to 3 students per team.
- **Roles:**
  - `student`: Form or join teams, manage submissions, upload deliverables (PDFs, slide decks, spreadsheets).
  - `judge`: Evaluate team submissions using a dedicated scoring grid and rubric form.
  - `admin`: Provision roles manually via Supabase Table Editor, monitor leaderboard rankings, and issue system announcements.

### Competition Tracks
Teams register under one of three distinct tracks:
1. **STEM**
2. **Art**
3. **Fitness**

### Core End-to-End Workflow
1. **Onboarding & Team Assembly:** Students register accounts, then create a team (generating a unique 6-character `invite_code`) or join an existing team using a teammate's code.
2. **Submission:** Teams upload project files (PDFs/slidedecks) directly into Supabase Storage. Submissions can be updated/replaced prior to the hard deadline.
3. **Evaluation:** Authenticated judges access a split-screen UI displaying the student submission alongside an interactive scoring rubric.
4. **Leaderboard & Administration:** Real-time mathematical averaging of judge rubric scores produces an automated leaderboard accessible to admins.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router), TypeScript
- **Styling**: Tailwind CSS
- **Hosting**: Vercel
- **Backend**: Supabase (Auth, PostgreSQL, Storage)
- **Auth pattern**: Cookie-based server-side auth via `@supabase/ssr`
- **Testing**: Vitest

---

## Critical Structural Constraints

- **No `src/` directory.** `app/`, `lib/`, `components/` live directly at the workspace root. Never create or suggest a `src/` layout.
- **Next.js 16 renamed Middleware → Proxy.** The route-protection file is `proxy.ts` at the project root (not `middleware.ts` — that convention no longer exists in this Next.js version). Same file-convention rules apply (single `proxy.ts`, exported `proxy` function, `config.matcher`).
- **RLS is mandatory on every table query path.** All core Supabase tables (`profiles`, `teams`, `submissions`) have Row Level Security enabled. Never write code that assumes RLS is off, and never suggest using the service-role key to bypass RLS from a client- or server-component context. Any new table added to the schema must ship with RLS policies in the same change.
- Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the public anon key) belong in `.env`. Never introduce the service-role key into app code, client bundles, or anything committed to git.

---

## Auth Architecture

Three separate Supabase client constructors, each for a distinct execution context — do not mix them up or reuse one where another belongs:

- `lib/supabase/client.ts` — `createBrowserClient`, for Client Components.
- `lib/supabase/server.ts` — `createServerClient` using `next/headers` cookies, for Server Components / Server Actions.
- `proxy.ts` — `createServerClient` using the request/response cookie API, for edge-level session refresh and route protection (currently redirects unauthenticated users away from `/dashboard`).

Login/signup logic lives in `app/login/actions.ts` as Server Actions (`login`, `signup`), called from the form in `app/login/page.tsx`. Session end-to-end: proxy refreshes the session cookie on every matched request → server components call `supabase.auth.getUser()` to read it → Server Actions mutate auth state directly against Supabase.

---

## Database Schema

- `public.profiles` — `id, email, first_name, last_name, phone, role, team_id`
- `public.teams` — `id, team_name, invite_code, count, memo, theme` (no track column — all teams participate in all categories; count = current member count, max 4)
- `public.submissions` — `id, team_id, title, file_url, description, ai_description, help_received, category (required), status, submitted_at`
- `public.student_details` — extended profile info: `user_id, first_name, last_name, phone, address, city, state, zip_code, school_name, gender, race, parent_*`
- `public.rubric_categories` — `id, rubric_type, name, weight_pct, total_pts, display_order`
- `public.rubric_criteria` — `id, category_id, name, min_score, max_score, score_weight, display_order`
- `public.judging_assignments` — `id, judge_id, team_id`
- `public.judging_scores` — `id, team_id, judge_id, criterion_id, score, submitted_at, locked`

RLS is enabled on all tables. When adding queries, check the existing policies before assuming a query will succeed — a query that looks correct can silently return zero rows if it doesn't satisfy RLS.

---

## Directory Layout