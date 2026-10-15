-- Mentors should be able to join a team regardless of the 3-student cap.
-- Also keep `teams.count` as a student-only count so the "X/3 members"
-- display stays accurate.
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
  v_team   record;
  v_role   text;
BEGIN
  SELECT id, count
    INTO v_team
    FROM public.teams
   WHERE invite_code = p_invite_code
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Team not found. Check the code and try again.');
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;

  -- Only students count against the 3-person cap.
  IF v_role IS DISTINCT FROM 'mentor' THEN
    IF COALESCE(v_team.count, 0) >= 3 THEN
      RETURN jsonb_build_object('error', 'This team is full (max 3 students).');
    END IF;

    UPDATE public.teams
       SET count = COALESCE(count, 0) + 1
     WHERE id = v_team.id;
  END IF;

  UPDATE public.profiles
     SET team_id = v_team.id
   WHERE id = p_user_id;

  RETURN jsonb_build_object('team_id', v_team.id);
END;
$$;
