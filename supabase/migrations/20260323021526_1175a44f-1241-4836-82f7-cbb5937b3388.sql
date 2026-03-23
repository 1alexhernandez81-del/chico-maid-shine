CREATE POLICY "Moderators can view all bookings" ON public.bookings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Moderators can update bookings" ON public.bookings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'moderator'::app_role));

DROP POLICY IF EXISTS "Service role can insert bookings" ON public.bookings;