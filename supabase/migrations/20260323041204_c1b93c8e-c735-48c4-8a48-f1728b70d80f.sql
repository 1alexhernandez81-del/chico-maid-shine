
-- Create job_time_entries table
CREATE TABLE public.job_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  started_at timestamptz,
  paused_at timestamptz,
  resumed_at timestamptz,
  stopped_at timestamptz,
  total_paused_minutes integer DEFAULT 0,
  total_worked_minutes integer DEFAULT 0,
  cleaners uuid[] DEFAULT '{}',
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_time_entries ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins full access to time entries"
  ON public.job_time_entries
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Moderators can select
CREATE POLICY "Moderators can view time entries"
  ON public.job_time_entries
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'));

-- Moderators can insert
CREATE POLICY "Moderators can insert time entries"
  ON public.job_time_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'moderator'));

-- Moderators can update
CREATE POLICY "Moderators can update time entries"
  ON public.job_time_entries
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'moderator'));

-- Add accepted_by column to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS accepted_by uuid REFERENCES auth.users(id);
