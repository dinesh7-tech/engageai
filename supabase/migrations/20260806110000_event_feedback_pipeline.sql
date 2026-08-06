-- Migration: 20260806110000_event_feedback_pipeline.sql
-- Create feedback campaigns, forms, and tokenized submissions for EventAI -> FeedbackAI pipeline

CREATE TABLE IF NOT EXISTS public.feedback_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  audience_type TEXT DEFAULT 'approved', -- 'approved' | 'checked_in' | 'all'
  status TEXT DEFAULT 'active', -- 'draft' | 'active' | 'closed'
  total_sent INT DEFAULT 0,
  total_responses INT DEFAULT 0,
  average_rating NUMERIC(3,2) DEFAULT 0,
  nps_score INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feedback_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.feedback_campaigns(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  template_type TEXT DEFAULT 'Custom',
  questions JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feedback_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.feedback_campaigns(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  registration_id UUID REFERENCES public.event_registrations(id) ON DELETE SET NULL,
  feedback_token TEXT UNIQUE NOT NULL,
  attendee_name TEXT NOT NULL,
  attendee_email TEXT,
  attendee_phone TEXT,
  rating INT,
  nps_rating INT,
  responses JSONB DEFAULT '{}'::jsonb,
  sentiment TEXT DEFAULT 'neutral', -- 'positive' | 'neutral' | 'negative'
  status TEXT DEFAULT 'completed', -- 'sent' | 'opened' | 'completed'
  submitted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Members manage campaigns" ON public.feedback_campaigns;
CREATE POLICY "Members manage campaigns" ON public.feedback_campaigns
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Members manage forms" ON public.feedback_forms;
CREATE POLICY "Members manage forms" ON public.feedback_forms
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Members manage submissions" ON public.feedback_submissions;
CREATE POLICY "Members manage submissions" ON public.feedback_submissions
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Allow public read/update of feedback_submissions by feedback_token
DROP POLICY IF EXISTS "Public access submission by token" ON public.feedback_submissions;
CREATE POLICY "Public access submission by token" ON public.feedback_submissions
  FOR SELECT USING (feedback_token IS NOT NULL);

DROP POLICY IF EXISTS "Public update submission by token" ON public.feedback_submissions;
CREATE POLICY "Public update submission by token" ON public.feedback_submissions
  FOR UPDATE USING (feedback_token IS NOT NULL);
