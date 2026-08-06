-- Migration: Production-ready SaaS Provisioning and RLS architecture

-- 1. Create Onboarding Checklist Table
CREATE TABLE IF NOT EXISTS public.onboarding_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  task_title text NOT NULL,
  task_description text,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on onboarding checklist
ALTER TABLE public.onboarding_checklist ENABLE ROW LEVEL SECURITY;

-- 2. Create Security Helper Functions
CREATE OR REPLACE FUNCTION public.is_workspace_member(workspace_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = is_workspace_member.workspace_id
      AND workspace_members.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_workspace_owner(workspace_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE workspaces.id = is_workspace_owner.workspace_id
      AND workspaces.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = is_workspace_owner.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role = 'owner'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 3. Create the Production-Ready Workspace Provisioning RPC
CREATE OR REPLACE FUNCTION public.create_workspace_transaction(
  p_name text,
  p_category text,
  p_timezone text,
  p_country text
)
RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
  v_full_name text;
  v_workspace_id uuid;
  v_existing_workspace_id uuid;
  v_slug text;
BEGIN
  -- Validate auth
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to provision workspace';
  END IF;

  -- Idempotency check: Return existing workspace if user is already a member
  SELECT workspace_id INTO v_existing_workspace_id
  FROM public.workspace_members
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_existing_workspace_id IS NOT NULL THEN
    RETURN v_existing_workspace_id;
  END IF;

  -- Fetch user profile name from metadata
  SELECT COALESCE(raw_user_meta_data ->> 'full_name', 'Business Owner') INTO v_full_name
  FROM auth.users
  WHERE id = v_user_id;

  -- 1. Upsert Profile
  INSERT INTO public.profiles (id, full_name, updated_at)
  VALUES (v_user_id, COALESCE(v_full_name, 'Business Owner'), now())
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
    updated_at = now();

  -- Generate slug
  v_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := regexp_replace(v_slug, '^-|-$', '', 'g');
  
  -- Append unique suffix if slug already exists to prevent duplicate failures
  IF EXISTS (SELECT 1 FROM public.workspaces WHERE slug = v_slug) THEN
    v_slug := v_slug || '-' || substr(md5(random()::text), 1, 6);
  END IF;

  -- 2. Create Workspace
  INSERT INTO public.workspaces (owner_id, name, slug, category, timezone, country, updated_at)
  VALUES (v_user_id, p_name, v_slug, p_category, p_timezone, p_country, now())
  RETURNING id INTO v_workspace_id;

  -- 3. Create Owner Membership
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, v_user_id, 'owner');

  -- 4. Create Provisioning Status
  INSERT INTO public.workspace_provisioning_status (workspace_id, current_step, completed_steps)
  VALUES (v_workspace_id, 'ready', ARRAY['started', 'profile_ready', 'workspace_ready', 'modules_installed', 'ready']);

  -- 5. Install Default Modules based on Category
  IF p_category = 'Events' THEN
    INSERT INTO public.workspace_modules (workspace_id, module_id, enabled)
    VALUES 
      (v_workspace_id, 'event_registry', true),
      (v_workspace_id, 'customer_reviews', true)
    ON CONFLICT (workspace_id, module_id) DO NOTHING;
  ELSIF p_category = 'Other' THEN
    INSERT INTO public.workspace_modules (workspace_id, module_id, enabled)
    VALUES 
      (v_workspace_id, 'queue_line', true),
      (v_workspace_id, 'event_registry', true),
      (v_workspace_id, 'customer_reviews', true)
    ON CONFLICT (workspace_id, module_id) DO NOTHING;
  ELSE
    INSERT INTO public.workspace_modules (workspace_id, module_id, enabled)
    VALUES 
      (v_workspace_id, 'queue_line', true),
      (v_workspace_id, 'customer_reviews', true)
    ON CONFLICT (workspace_id, module_id) DO NOTHING;
  END IF;

  -- 6. Create Default Automation Rules
  INSERT INTO public.automation_rules (workspace_id, trigger_event, action_type, action_config, enabled)
  VALUES (
    v_workspace_id,
    'queue_exit',
    'send_whatsapp',
    '{"message_template": "Hi {{customer_name}}, thank you for visiting us today!"}'::jsonb,
    true
  );

  -- 7. Create Onboarding Checklist Items
  INSERT INTO public.onboarding_checklist (workspace_id, task_title, task_description)
  VALUES
    (v_workspace_id, 'Configure your Queue Line services', 'Define hair-styling, billing waitlists, or table times inside the queue queue.'),
    (v_workspace_id, 'Generate workspace QR check-in', 'Expose your check-in portal link so clients can scan and join queues.'),
    (v_workspace_id, 'Host your first Event registry', 'Pre-program summit checkpoints, registration lists, or ticket lines.'),
    (v_workspace_id, 'Request customer reviews', 'Design a feedback campaign to send review requests over WhatsApp.'),
    (v_workspace_id, 'Link custom WhatsApp settings', 'Optionally connect Twilio/Meta API sandbox channels to start sending text alerts.');

  RETURN v_workspace_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Workspace creation transaction failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;


-- 4. Drop and Recreate RLS Policies on workspace_members
DROP POLICY IF EXISTS "Members can read memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Owner can manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owner can delete members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owner can update members" ON public.workspace_members;

CREATE POLICY "Members can read memberships" ON public.workspace_members
  FOR SELECT USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Owner can manage members" ON public.workspace_members
  FOR INSERT WITH CHECK (public.is_workspace_owner(workspace_id));

CREATE POLICY "Owner can update members" ON public.workspace_members
  FOR UPDATE USING (public.is_workspace_owner(workspace_id));

CREATE POLICY "Owner can delete members" ON public.workspace_members
  FOR DELETE USING (public.is_workspace_owner(workspace_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;


-- 5. Drop and Recreate RLS Policies on workspaces
DROP POLICY IF EXISTS "Members can read workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Owner can update workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Authenticated users can create workspace" ON public.workspaces;

CREATE POLICY "Members can read workspace" ON public.workspaces
  FOR SELECT USING (owner_id = auth.uid() OR public.is_workspace_member(id));

CREATE POLICY "Owner can update workspace" ON public.workspaces
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create workspace" ON public.workspaces
  FOR INSERT WITH CHECK (auth.uid() = owner_id);


-- 6. Drop and Recreate RLS Policies on queue_entries
DROP POLICY IF EXISTS "Members can read queue" ON public.queue_entries;
DROP POLICY IF EXISTS "Members can insert queue" ON public.queue_entries;
DROP POLICY IF EXISTS "Members can update queue" ON public.queue_entries;

CREATE POLICY "Members can read queue" ON public.queue_entries
  FOR SELECT USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can insert queue" ON public.queue_entries
  FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update queue" ON public.queue_entries
  FOR UPDATE USING (public.is_workspace_member(workspace_id));


-- 7. Drop and Recreate RLS Policies on events
DROP POLICY IF EXISTS "Members can read events" ON public.events;
DROP POLICY IF EXISTS "Members can insert events" ON public.events;
DROP POLICY IF EXISTS "Members can update events" ON public.events;

CREATE POLICY "Members can read events" ON public.events
  FOR SELECT USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can insert events" ON public.events
  FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update events" ON public.events
  FOR UPDATE USING (public.is_workspace_member(workspace_id));


-- 8. Drop and Recreate RLS Policies on event_registrations
DROP POLICY IF EXISTS "Members can read registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Members can insert registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Members can update registrations" ON public.event_registrations;

CREATE POLICY "Members can read registrations" ON public.event_registrations
  FOR SELECT USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can insert registrations" ON public.event_registrations
  FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update registrations" ON public.event_registrations
  FOR UPDATE USING (public.is_workspace_member(workspace_id));


-- 9. Drop and Recreate RLS Policies on feedback_entries
DROP POLICY IF EXISTS "Members can read feedback" ON public.feedback_entries;
DROP POLICY IF EXISTS "Members can insert feedback" ON public.feedback_entries;
DROP POLICY IF EXISTS "Members can update feedback" ON public.feedback_entries;

CREATE POLICY "Members can read feedback" ON public.feedback_entries
  FOR SELECT USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can insert feedback" ON public.feedback_entries
  FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update feedback" ON public.feedback_entries
  FOR UPDATE USING (public.is_workspace_member(workspace_id));


-- 10. Drop and Recreate RLS Policies on activity_events
DROP POLICY IF EXISTS "Members can read activity" ON public.activity_events;
CREATE POLICY "Members can read activity" ON public.activity_events
  FOR SELECT USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id));


-- 11. Drop and Recreate RLS Policies on notifications
DROP POLICY IF EXISTS "Members can read notifications" ON public.notifications;
CREATE POLICY "Members can read notifications" ON public.notifications
  FOR SELECT USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id));


-- 12. Drop and Recreate RLS Policies on workspace_provisioning_status
DROP POLICY IF EXISTS "Allow members read workspace provisioning status" ON public.workspace_provisioning_status;
DROP POLICY IF EXISTS "Allow members update workspace provisioning status" ON public.workspace_provisioning_status;

CREATE POLICY "Allow members read workspace provisioning status" ON public.workspace_provisioning_status
  FOR SELECT USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Allow members update workspace provisioning status" ON public.workspace_provisioning_status
  FOR ALL 
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));


-- 13. Drop and Recreate RLS Policies on workspace_modules
DROP POLICY IF EXISTS "Allow members read workspace modules" ON public.workspace_modules;
DROP POLICY IF EXISTS "Allow members update workspace modules" ON public.workspace_modules;

CREATE POLICY "Allow members read workspace modules" ON public.workspace_modules
  FOR SELECT USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Allow members update workspace modules" ON public.workspace_modules
  FOR ALL 
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));


-- 14. Drop and Recreate RLS Policies on business_events
DROP POLICY IF EXISTS "Allow members read workspace business events" ON public.business_events;
DROP POLICY IF EXISTS "Allow members insert workspace business events" ON public.business_events;

CREATE POLICY "Allow members read workspace business events" ON public.business_events
  FOR SELECT USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Allow members insert workspace business events" ON public.business_events
  FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id));


-- 15. Drop and Recreate RLS Policies on automation_rules
DROP POLICY IF EXISTS "Allow members all automation rules" ON public.automation_rules;

CREATE POLICY "Allow members all automation rules" ON public.automation_rules
  FOR ALL 
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));


-- 16. Drop and Recreate RLS Policies on automation_executions
DROP POLICY IF EXISTS "Allow members select automation executions" ON public.automation_executions;

CREATE POLICY "Allow members select automation executions" ON public.automation_executions
  FOR SELECT USING (public.is_workspace_member(workspace_id));


-- 17. Onboarding Checklist RLS Policies
DROP POLICY IF EXISTS "Members can read onboarding checklist" ON public.onboarding_checklist;
DROP POLICY IF EXISTS "Members can update onboarding checklist" ON public.onboarding_checklist;

CREATE POLICY "Members can read onboarding checklist" ON public.onboarding_checklist
  FOR SELECT USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can update onboarding checklist" ON public.onboarding_checklist
  FOR UPDATE 
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));
