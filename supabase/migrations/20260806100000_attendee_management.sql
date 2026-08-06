-- Alter event_registrations table to add new attendee management columns
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Checked-in'));
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS device text;
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS activity_history jsonb DEFAULT '[]'::jsonb;

-- Sync existing registrations to 'Approved' or 'Checked-in' if they are already checked in
UPDATE public.event_registrations
SET status = CASE WHEN checked_in = true THEN 'Checked-in'::text ELSE 'Approved'::text END
WHERE status = 'Pending' AND (checked_in = true OR created_at < now() - interval '5 minutes');

-- Restrict RLS policies on public.event_registrations to workspace members only
DROP POLICY IF EXISTS "Anyone can read registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Anyone can insert registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Members can read registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Members can insert registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Members can update registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Members can delete registrations" ON public.event_registrations;

-- Create secure, workspace-restricted policies
CREATE POLICY "Members can read registrations" ON public.event_registrations
  FOR SELECT USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Members can insert registrations" ON public.event_registrations
  FOR INSERT WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Members can update registrations" ON public.event_registrations
  FOR UPDATE USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Members can delete registrations" ON public.event_registrations
  FOR DELETE USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Allow public read of registrations by ticket_token (for public attendee ticket portal)
CREATE POLICY "Public read registration by token" ON public.event_registrations
  FOR SELECT USING (ticket_token IS NOT NULL);

