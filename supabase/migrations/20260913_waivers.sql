-- Per-student parental consent/liability waiver.
-- Every student must complete a waiver (filled on-screen OR signed PDF uploaded)
-- before they can submit a project. Gate is enforced per signed-in user.

-- 1. Table.
CREATE TABLE IF NOT EXISTS public.waivers (
  user_id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  student_full_name  text,
  parent_name        text,
  parent_phone       text,
  parent_email       text,
  parent_signature   text,
  student_signature  text,
  signed_date        date,
  media_consent      boolean NOT NULL DEFAULT false,
  agreed             boolean NOT NULL DEFAULT false,
  file_url           text,
  completed_at       timestamptz,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- 2. RLS (mandatory per project constraints).
ALTER TABLE public.waivers ENABLE ROW LEVEL SECURITY;

-- Students read/write only their own waiver; admins can read all.
CREATE POLICY "own_waiver_select" ON public.waivers
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "own_waiver_insert" ON public.waivers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_waiver_update" ON public.waivers
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Private storage bucket for uploaded signed PDFs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('waivers', 'waivers', false)
ON CONFLICT (id) DO NOTHING;

-- Users may read/write only objects under their own uid folder: `<uid>/...`.
CREATE POLICY "waivers_read_own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'waivers'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

CREATE POLICY "waivers_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'waivers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "waivers_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'waivers'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
