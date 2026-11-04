-- Weekly digest of newly created student profiles, emailed by a Vercel cron.

-- 1. Track when a student profile was created. Existing rows stay NULL so the
--    first digest doesn't list everyone who signed up before this change.
ALTER TABLE public.student_details ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE public.student_details ALTER COLUMN created_at SET DEFAULT now();

-- 2. Secret store for the cron job. RLS on + deny-all policy = unreachable via the API.
CREATE TABLE IF NOT EXISTS public.internal_secrets (
  name  text PRIMARY KEY,
  value text NOT NULL
);
ALTER TABLE public.internal_secrets ENABLE ROW LEVEL SECURITY;

-- Explicit deny-all for API roles; only SECURITY DEFINER functions can read it.
CREATE POLICY "no_client_access" ON public.internal_secrets
  FOR ALL USING (false) WITH CHECK (false);

-- After applying, set the secret to the same value as CRON_SECRET in Vercel:
--   INSERT INTO public.internal_secrets (name, value) VALUES ('cron', '<CRON_SECRET>')
--   ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value;

-- 3. The cron has no user session, so it reads through this guarded function
--    instead of the service-role key. It returns only the digest columns.
CREATE OR REPLACE FUNCTION public.weekly_profile_digest(p_secret text, p_since timestamptz)
RETURNS TABLE (
  first_name  text,
  last_name   text,
  email       text,
  school_name text,
  created_at  timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.internal_secrets s WHERE s.name = 'cron' AND s.value = p_secret
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
    SELECT d.first_name, d.last_name, p.email, d.school_name, d.created_at
    FROM public.student_details d
    LEFT JOIN public.profiles p ON p.id = d.user_id
    WHERE d.created_at >= p_since
    ORDER BY d.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.weekly_profile_digest(text, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.weekly_profile_digest(text, timestamptz) TO anon, authenticated;
