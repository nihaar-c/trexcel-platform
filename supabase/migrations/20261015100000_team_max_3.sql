-- Lower the team capacity cap from 4 to 3 (max 3 students per team).
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
  SELECT id, count
    INTO v_team
    FROM public.teams
   WHERE invite_code = p_invite_code
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Team not found. Check the code and try again.');
  END IF;

  IF COALESCE(v_team.count, 0) >= 3 THEN
    RETURN jsonb_build_object('error', 'This team is full (max 3 members).');
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
