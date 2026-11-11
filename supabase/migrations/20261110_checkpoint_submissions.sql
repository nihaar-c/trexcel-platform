-- Checkpoint form tracking (one row per team per checkpoint).
-- Row exists  => team's checkpoint is marked submitted.
-- Students insert a row when they confirm they sent the Google Form;
-- admins can add or remove rows (check / uncheck) from the admin Teams page.

CREATE TABLE IF NOT EXISTS public.checkpoint_submissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id       uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  checkpoint    smallint NOT NULL CHECK (checkpoint BETWEEN 1 AND 4),
  submitted_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, checkpoint)
);

ALTER TABLE public.checkpoint_submissions ENABLE ROW LEVEL SECURITY;

-- Team members (and admins) can see their team's checkpoints.
CREATE POLICY "checkpoint_select" ON public.checkpoint_submissions
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.team_id = checkpoint_submissions.team_id
    )
  );

-- Students can confirm checkpoints 1-2 for their own team; admins can mark any.
CREATE POLICY "checkpoint_insert_student" ON public.checkpoint_submissions
  FOR INSERT WITH CHECK (
    submitted_by = auth.uid()
    AND checkpoint IN (1, 2)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'student'
        AND p.team_id = checkpoint_submissions.team_id
    )
  );

CREATE POLICY "checkpoint_insert_admin" ON public.checkpoint_submissions
  FOR INSERT WITH CHECK (public.is_admin());

-- Only admins can un-check.
CREATE POLICY "checkpoint_delete_admin" ON public.checkpoint_submissions
  FOR DELETE USING (public.is_admin());
