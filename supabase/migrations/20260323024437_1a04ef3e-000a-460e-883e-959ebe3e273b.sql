
CREATE OR REPLACE FUNCTION public.approve_quote_by_token(_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _booking record;
BEGIN
  SELECT * INTO _booking FROM public.bookings
  WHERE confirmation_token = _token
    AND status IN ('quoted', 'estimate-scheduled', 'pending', 'contacted')
    AND created_at > now() - interval '30 days'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found_or_expired');
  END IF;

  UPDATE public.bookings
  SET status = 'approved',
      confirmed_at = now()
  WHERE confirmation_token = _token;

  RETURN jsonb_build_object('success', true, 'name', _booking.name, 'service_type', _booking.service_type);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_booking_by_token(_token uuid)
 RETURNS TABLE(id uuid, name text, email text, phone text, street text, city text, zip text, service_type text, frequency text, preferred_date text, preferred_time text, scheduled_date text, scheduled_time text, confirmed_at timestamp with time zone, status text, total_price numeric, sqft text, bedrooms text, bathrooms text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, name, email, phone, street, city, zip, service_type, frequency,
         preferred_date, preferred_time, scheduled_date, scheduled_time, confirmed_at, status,
         total_price, sqft, bedrooms, bathrooms
  FROM public.bookings
  WHERE confirmation_token = _token
    AND created_at > now() - interval '30 days'
  LIMIT 1;
$function$;
