-- 1. Create Event Categories Table
CREATE TABLE IF NOT EXISTS public.event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE, -- NULL means built-in
  name text NOT NULL,
  icon text,
  cover_image text,
  color text,
  description text,
  default_form_fields jsonb DEFAULT '[]'::jsonb,
  default_automation jsonb DEFAULT '{}'::jsonb,
  default_landing_page jsonb DEFAULT '{}'::jsonb,
  default_certificate jsonb DEFAULT '{}'::jsonb,
  default_email_template jsonb DEFAULT '{}'::jsonb,
  default_whatsapp_template jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories" ON public.event_categories
  FOR SELECT USING (workspace_id IS NULL OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Members can manage categories" ON public.event_categories
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

GRANT SELECT ON public.event_categories TO anon, authenticated;
GRANT ALL ON public.event_categories TO authenticated;


-- 2. Create Event Templates Table
CREATE TABLE IF NOT EXISTS public.event_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.event_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  theme text,
  default_form_fields jsonb DEFAULT '[]'::jsonb,
  default_automation jsonb DEFAULT '{}'::jsonb,
  default_landing_page jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read templates" ON public.event_templates
  FOR SELECT USING (workspace_id IS NULL OR workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Members can manage templates" ON public.event_templates
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

GRANT SELECT ON public.event_templates TO anon, authenticated;
GRANT ALL ON public.event_templates TO authenticated;


-- 3. Alter public.events to support categories, statuses, registration limits and themes
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.event_categories(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS subcategory text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_type text DEFAULT 'unlimited' CHECK (registration_type IN ('unlimited', 'capacity'));
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS capacity_limit integer;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS approval_mode text DEFAULT 'auto' CHECK (approval_mode IN ('auto', 'manual'));
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS theme text DEFAULT 'Professional';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS landing_page_sections jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS custom_landing_config jsonb DEFAULT '{}'::jsonb;

-- Modify check constraint on status column to support new statuses
-- First, drop the old check constraint if it exists. In multi_tenant_schema it was: CHECK (status IN ('upcoming', 'live', 'completed'))
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_status_check;

-- Map any existing old statuses to the new schema values before adding the constraint
UPDATE public.events SET status = 'published' WHERE status = 'upcoming';
UPDATE public.events SET status = 'ongoing' WHERE status = 'live';

ALTER TABLE public.events ADD CONSTRAINT events_status_check CHECK (
  status IN ('draft', 'published', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled', 'expired', 'upcoming', 'live')
);

-- Public SELECT policy for events to allow `/e/$slug` landing page views
DROP POLICY IF EXISTS "Members can read events" ON public.events;
DROP POLICY IF EXISTS "Anyone can read events" ON public.events;
CREATE POLICY "Anyone can read events" ON public.events
  FOR SELECT USING (true);

-- Ensure all event modifications require membership
DROP POLICY IF EXISTS "Members can insert events" ON public.events;
CREATE POLICY "Members can insert events" ON public.events
  FOR INSERT WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Members can update events" ON public.events;
CREATE POLICY "Members can update events" ON public.events
  FOR UPDATE USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

GRANT SELECT ON public.events TO anon, authenticated;


-- 4. Create Event Form Fields Table
CREATE TABLE IF NOT EXISTS public.event_form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'number', 'email', 'tel', 'select', 'textarea', 'checkbox')),
  required boolean NOT NULL DEFAULT false,
  field_options jsonb DEFAULT '[]'::jsonb, -- Options for select inputs
  conditional_rules jsonb DEFAULT '[]'::jsonb, -- Logic for conditional display
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.event_form_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read form fields" ON public.event_form_fields
  FOR SELECT USING (true);

CREATE POLICY "Members can manage form fields" ON public.event_form_fields
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

GRANT SELECT ON public.event_form_fields TO anon, authenticated;
GRANT ALL ON public.event_form_fields TO authenticated;


-- 5. Create Event Tickets Table (for multiple ticket tiers and payment prep)
CREATE TABLE IF NOT EXISTS public.event_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL, -- e.g. 'General Admission', 'VIP', 'Student'
  description text,
  ticket_type text NOT NULL DEFAULT 'free' CHECK (ticket_type IN ('free', 'paid')),
  price numeric(10, 2) DEFAULT 0.00,
  currency text DEFAULT 'INR',
  capacity_limit integer, -- Limit for this specific ticket type
  quantity_sold integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.event_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tickets" ON public.event_tickets
  FOR SELECT USING (true);

CREATE POLICY "Members can manage tickets" ON public.event_tickets
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

GRANT SELECT ON public.event_tickets TO anon, authenticated;
GRANT ALL ON public.event_tickets TO authenticated;


-- 6. Alter public.event_registrations for Ticket Tokens, Ticket Tiers, and Custom Responses
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS ticket_token text UNIQUE;
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS ticket_type_id uuid REFERENCES public.event_tickets(id) ON DELETE SET NULL;
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS form_responses jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'free' CHECK (payment_status IN ('free', 'pending', 'paid', 'refunded'));
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS payment_details jsonb DEFAULT '{}'::jsonb;

-- Public SELECT and INSERT policies on event_registrations
DROP POLICY IF EXISTS "Members can read registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Anyone can read registrations" ON public.event_registrations;
CREATE POLICY "Anyone can read registrations" ON public.event_registrations
  FOR SELECT USING (true); -- Allow looking up own ticket by ticket_token (filtered in queries)

DROP POLICY IF EXISTS "Members can insert registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Anyone can insert registrations" ON public.event_registrations;
CREATE POLICY "Anyone can insert registrations" ON public.event_registrations
  FOR INSERT WITH CHECK (true); -- Allow public user to register

DROP POLICY IF EXISTS "Members can update registrations" ON public.event_registrations;
CREATE POLICY "Members can update registrations" ON public.event_registrations
  FOR UPDATE USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

GRANT SELECT, INSERT ON public.event_registrations TO anon, authenticated;
GRANT ALL ON public.event_registrations TO authenticated;


-- 7. Create Event Checkins Table (Normalized attendance tracking)
CREATE TABLE IF NOT EXISTS public.event_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id uuid NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
  checked_in_at timestamptz DEFAULT now(),
  scanned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read checkins" ON public.event_checkins
  FOR SELECT USING (true);

CREATE POLICY "Members can manage checkins" ON public.event_checkins
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

GRANT SELECT ON public.event_checkins TO anon, authenticated;
GRANT ALL ON public.event_checkins TO authenticated;


-- 8. Create Event Certificates Table
CREATE TABLE IF NOT EXISTS public.event_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  template_html text,
  variables jsonb DEFAULT '[]'::jsonb,
  issued_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.event_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read certificates" ON public.event_certificates
  FOR SELECT USING (true);

CREATE POLICY "Members can manage certificates" ON public.event_certificates
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

GRANT SELECT ON public.event_certificates TO anon, authenticated;
GRANT ALL ON public.event_certificates TO authenticated;


-- 9. Create Event Automation Links Table (reusable workflows)
CREATE TABLE IF NOT EXISTS public.event_automation_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  rule_id uuid NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, rule_id)
);

ALTER TABLE public.event_automation_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read automation links" ON public.event_automation_links
  FOR SELECT USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Members can manage automation links" ON public.event_automation_links
  FOR ALL USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

GRANT ALL ON public.event_automation_links TO authenticated;


-- 10. Create Event Analytics Table (Tracking page traffic, views, sources)
CREATE TABLE IF NOT EXISTS public.event_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('view', 'qr_scan', 'registration')),
  traffic_source text DEFAULT 'direct', -- e.g. 'whatsapp', 'facebook', 'email', 'direct'
  device_type text, -- e.g. 'mobile', 'desktop'
  browser text,
  country text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.event_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics" ON public.event_analytics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Members can read analytics" ON public.event_analytics
  FOR SELECT USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

GRANT INSERT ON public.event_analytics TO anon, authenticated;
GRANT ALL ON public.event_analytics TO authenticated;


-- 11. Trigger to automatically generate unique event slug if missing/empty
CREATE OR REPLACE FUNCTION public.ensure_event_slug()
RETURNS trigger AS $$
DECLARE
  v_slug text;
  v_base_slug text;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    v_base_slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_base_slug := regexp_replace(v_base_slug, '^-|-$', '', 'g');
    
    IF v_base_slug = '' THEN
      v_base_slug := 'event';
    END IF;
    
    v_slug := v_base_slug;
    
    WHILE EXISTS (SELECT 1 FROM public.events WHERE slug = v_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
      v_slug := v_base_slug || '-' || substr(md5(random()::text), 1, 6);
    END LOOP;
    
    NEW.slug := v_slug;
  ELSE
    NEW.slug := lower(regexp_replace(NEW.slug, '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.slug := regexp_replace(NEW.slug, '^-|-$', '', 'g');
    
    v_slug := NEW.slug;
    WHILE EXISTS (SELECT 1 FROM public.events WHERE slug = v_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
      v_slug := NEW.slug || '-' || substr(md5(random()::text), 1, 6);
    END LOOP;
    NEW.slug := v_slug;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_event_slug_trigger ON public.events;
CREATE TRIGGER ensure_event_slug_trigger
  BEFORE INSERT OR UPDATE OF name, slug ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.ensure_event_slug();
