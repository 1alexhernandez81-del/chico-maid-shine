CREATE OR REPLACE FUNCTION public.select_estimate_time(_token uuid, _date text, _time text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _booking record;
BEGIN
  SELECT * INTO _booking FROM public.bookings
  WHERE confirmation_token = _token
    AND created_at > now() - interval '30 days'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found_or_expired');
  END IF;

  -- Only allow picking time if not already scheduled for cleaning
  IF _booking.status IN ('scheduled', 'completed', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_scheduled');
  END IF;

  UPDATE public.bookings
  SET estimate_date = _date,
      estimate_time = _time,
      status = 'estimate-scheduled',
      updated_at = now()
  WHERE confirmation_token = _token;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', _booking.id,
    'name', _booking.name,
    'email', _booking.email,
    'street', _booking.street,
    'city', _booking.city,
    'zip', _booking.zip,
    'service_type', _booking.service_type
  );
END;
$$;