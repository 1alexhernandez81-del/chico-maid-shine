
DROP POLICY IF EXISTS "Authenticated users can view cleaners" ON public.cleaners;

CREATE POLICY "Moderators can view cleaners"
ON public.cleaners
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role));
