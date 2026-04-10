DROP TABLE IF EXISTS public.user_achievements CASCADE;

CREATE OR REPLACE FUNCTION public.perform_daily_checkin_as_service(
  p_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := current_date;
  v_current_credits integer := 0;
  v_new_credits integer := 0;
  v_membership text := 'free';
  v_membership_expires_at timestamptz;
  v_effective_membership text := 'free';
  v_credit_limit integer := 10;
  v_base_reward integer := 1;
  v_reward_credits integer := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT
    COALESCE(ai_chat_count, 0),
    COALESCE(membership, 'free'),
    membership_expires_at
  INTO
    v_current_credits,
    v_membership,
    v_membership_expires_at
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'user_not_found');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.daily_checkins
    WHERE user_id = p_user_id
      AND checkin_date = v_today
  ) THEN
    RETURN jsonb_build_object(
      'status', 'already_checked_in',
      'reward_credits', 0
    );
  END IF;

  IF v_membership IN ('plus', 'pro')
    AND v_membership_expires_at IS NOT NULL
    AND v_membership_expires_at > now() THEN
    v_effective_membership := v_membership;
  END IF;

  v_credit_limit := public.membership_credit_limit(v_effective_membership);

  IF v_current_credits >= v_credit_limit THEN
    RETURN jsonb_build_object(
      'status', 'credit_cap_reached',
      'reward_credits', 0,
      'credits', v_current_credits,
      'credit_limit', v_credit_limit
    );
  END IF;

  v_base_reward := FLOOR(random() * 3)::integer + 1;
  v_reward_credits := CASE v_effective_membership
    WHEN 'pro' THEN v_base_reward * 3
    WHEN 'plus' THEN v_base_reward * 2
    ELSE v_base_reward
  END;
  v_new_credits := v_current_credits + v_reward_credits;

  INSERT INTO public.daily_checkins (
    user_id,
    checkin_date,
    reward_credits
  ) VALUES (
    p_user_id,
    v_today,
    v_reward_credits
  );

  UPDATE public.users
  SET
    ai_chat_count = v_new_credits,
    updated_at = now()
  WHERE id = p_user_id;

  PERFORM public.record_credit_transaction(
    p_user_id,
    v_reward_credits,
    'earn',
    'checkin',
    v_new_credits,
    'daily_checkin',
    v_today::text,
    format('每日签到 +%s 积分', v_reward_credits),
    jsonb_build_object('membership', v_effective_membership, 'base_reward', v_base_reward)
  );

  RETURN jsonb_build_object(
    'status', 'ok',
    'reward_credits', v_reward_credits,
    'credits', v_new_credits,
    'membership', v_effective_membership,
    'credit_limit', v_credit_limit
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'status', 'already_checked_in',
      'reward_credits', 0
    );
END;
$$;

REVOKE ALL ON FUNCTION public.perform_daily_checkin_as_service(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.perform_daily_checkin_as_service(uuid) TO service_role;
