-- ============================================================
-- Multi-Tenant SaaS Schema
-- Creates all tables needed for real workspace-scoped data.
-- ============================================================

-- 1. Profiles (linked to auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Workspaces
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'Other',
  logo_url text,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  country text NOT NULL DEFAULT 'IN',
  plan text NOT NULL DEFAULT 'Free',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- 3. Workspace Members
CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'operator' CHECK (role IN ('owner', 'admin', 'operator')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- RLS: Users can see workspaces they are members of
CREATE POLICY "Members can read workspace" ON public.workspaces FOR SELECT
  USING (id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Owner can update workspace" ON public.workspaces FOR UPDATE
  USING (owner_id = auth.uid());
CREATE POLICY "Authenticated users can create workspace" ON public.workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Members can read memberships" ON public.workspace_members FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Owner can manage members" ON public.workspace_members FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Owner can delete members" ON public.workspace_members FOR DELETE
  USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE ON public.workspaces TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.workspace_members TO authenticated;

-- 4. Queue Entries
CREATE TABLE public.queue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  token text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  service text,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'serving', 'completed', 'exited')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  served_at timestamptz,
  completed_at timestamptz,
  eta_minutes integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read queue" ON public.queue_entries FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert queue" ON public.queue_entries FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update queue" ON public.queue_entries FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
GRANT SELECT, INSERT, UPDATE ON public.queue_entries TO authenticated;
CREATE INDEX queue_entries_workspace_idx ON public.queue_entries (workspace_id, status, joined_at DESC);

-- 5. Events
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  date timestamptz,
  venue text,
  description text,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read events" ON public.events FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert events" ON public.events FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update events" ON public.events FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
GRANT SELECT, INSERT, UPDATE ON public.events TO authenticated;

-- 6. Event Registrations
CREATE TABLE public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  checked_in boolean NOT NULL DEFAULT false,
  checked_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read registrations" ON public.event_registrations FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert registrations" ON public.event_registrations FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update registrations" ON public.event_registrations FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
GRANT SELECT, INSERT, UPDATE ON public.event_registrations TO authenticated;
CREATE INDEX event_registrations_event_idx ON public.event_registrations (event_id);

-- 7. Feedback Entries
CREATE TABLE public.feedback_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text,
  channel text DEFAULT 'QR Form',
  rating integer CHECK (rating >= 1 AND rating <= 5),
  sentiment text DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  category text,
  text text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feedback_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read feedback" ON public.feedback_entries FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert feedback" ON public.feedback_entries FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update feedback" ON public.feedback_entries FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
GRANT SELECT, INSERT, UPDATE ON public.feedback_entries TO authenticated;
CREATE INDEX feedback_entries_workspace_idx ON public.feedback_entries (workspace_id, created_at DESC);

-- 8. Alter existing tables to use UUID workspace_id
-- Drop old policies and columns, recreate with proper FK

-- activity_events: drop old text workspace_id, add uuid one
ALTER TABLE public.activity_events DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.activity_events ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
DROP POLICY IF EXISTS "Activity is publicly readable" ON public.activity_events;
CREATE POLICY "Members can read activity" ON public.activity_events FOR SELECT
  USING (workspace_id IS NULL OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Service role can insert activity" ON public.activity_events FOR INSERT
  WITH CHECK (true);
GRANT INSERT ON public.activity_events TO authenticated;

-- notifications: drop old text workspace_id, add uuid one
ALTER TABLE public.notifications DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.notifications ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
DROP POLICY IF EXISTS "Notifications are publicly readable" ON public.notifications;
CREATE POLICY "Members can read notifications" ON public.notifications FOR SELECT
  USING (workspace_id IS NULL OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Service role can insert notifications" ON public.notifications FOR INSERT
  WITH CHECK (true);
GRANT INSERT ON public.notifications TO authenticated;

-- Enable realtime on new tables
ALTER TABLE public.queue_entries REPLICA IDENTITY FULL;
ALTER TABLE public.events REPLICA IDENTITY FULL;
ALTER TABLE public.feedback_entries REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback_entries;
