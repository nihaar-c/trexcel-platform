-- Convert profiles.role from free-text to a constrained enum.
-- Prevents silent RLS/gate failures from typos like 'Judge' or 'mentee'.

-- 1. Create the enum type (idempotent).
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('student', 'judge', 'mentor', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Normalize existing data so the cast in step 4 can't fail on a bad value.
UPDATE public.profiles
  SET role = 'student'
  WHERE role IS NULL OR role NOT IN ('student', 'judge', 'mentor', 'admin');

-- 3. Drop the old text default before changing the column type.
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;

-- 4. Convert the column to the enum.
ALTER TABLE public.profiles
  ALTER COLUMN role TYPE public.user_role USING role::public.user_role;

-- 5. Restore the default (now enum-typed) and enforce NOT NULL so bare
--    trigger-created rows land on 'student' instead of NULL.
ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'student'::public.user_role;
ALTER TABLE public.profiles
  ALTER COLUMN role SET NOT NULL;
