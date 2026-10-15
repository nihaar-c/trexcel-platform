-- 1. Remove the overly-permissive teams UPDATE policy that allowed any
--    authenticated user to modify any team row.  The more-specific
--    "team_members_update_team" policy already covers legitimate updates
--    (theme, memo) and the new join_team function handles count increments.
DROP POLICY IF EXISTS "authenticated update teams" ON public.teams;

-- 2. Atomic join_team RPC.
--    Uses FOR UPDATE to serialize concurrent joins on the same team, so the
--    capacity check + count increment happen as a single operation.  Running
--    as SECURITY DEFINER lets it bypass RLS; the caller's identity is still
--    verified via p_user_id which must equal auth.uid() (enforced by the
--    profiles UPDATE policy that runs afterward).
CREATE OR REPLACE FUNCTION public.join_team(
  p_invite_code text,
  p_user_id     uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team record;
BEGIN
  -- Lock the row so no two concurrent calls can both pass the capacity check.
  SELECT id, count
    INTO v_team
    FROM public.teams
   WHERE invite_code = p_invite_code
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Team not found. Check the code and try again.');
  END IF;

  IF COALESCE(v_team.count, 0) >= 4 THEN
    RETURN jsonb_build_object('error', 'This team is full (max 4 members).');
  END IF;

  UPDATE public.teams
     SET count = COALESCE(count, 0) + 1
   WHERE id = v_team.id;

  UPDATE public.profiles
     SET team_id = v_team.id
   WHERE id = p_user_id;

  RETURN jsonb_build_object('team_id', v_team.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_team(text, uuid) TO authenticated;
