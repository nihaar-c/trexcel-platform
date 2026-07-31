ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mentor_request_memo text;
