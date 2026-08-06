-- Database schema for EngageAI Business OS Foundation Refactor

-- 1. Provisioning Status table
CREATE TABLE IF NOT EXISTS public.workspace_provisioning_status (
    workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
    current_step TEXT NOT NULL DEFAULT 'started', -- 'started', 'profile_ready', 'workspace_ready', 'modules_installed', 'ready'
    completed_steps TEXT[] DEFAULT '{}',
    last_error TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on provisioning status
ALTER TABLE public.workspace_provisioning_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members read workspace provisioning status"
    ON public.workspace_provisioning_status FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = workspace_provisioning_status.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow members update workspace provisioning status"
    ON public.workspace_provisioning_status FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = workspace_provisioning_status.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

-- 2. Modules Registry and Workspace Modules
CREATE TABLE IF NOT EXISTS public.modules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed basic modules
INSERT INTO public.modules (id, name, description, icon)
VALUES 
    ('queue_line', 'Queue Line', 'Virtual waiting list & queue recovery', 'Users2')
    ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules (id, name, description, icon)
VALUES 
    ('event_registry', 'Event Registry', 'Attendee registrations & dynamic check-in systems', 'CalendarDays')
    ON CONFLICT (id) DO NOTHING;

INSERT INTO public.modules (id, name, description, icon)
VALUES 
    ('customer_reviews', 'Customer Reviews', 'AI customer sentiment feedback triggers', 'MessageSquareHeart')
    ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.workspace_modules (
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    module_id TEXT REFERENCES public.modules(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (workspace_id, module_id)
);

ALTER TABLE public.workspace_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members read workspace modules"
    ON public.workspace_modules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = workspace_modules.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow members update workspace modules"
    ON public.workspace_modules FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = workspace_modules.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

-- 3. Business Event System
CREATE TABLE IF NOT EXISTS public.business_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'customer_joined_queue', 'queue_exit', 'feedback_submitted', 'whatsapp_sent'
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.business_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members read workspace business events"
    ON public.business_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = business_events.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Allow members insert workspace business events"
    ON public.business_events FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = business_events.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

-- 4. Automation rules and logs
CREATE TABLE IF NOT EXISTS public.automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    trigger_event TEXT NOT NULL, -- e.g. 'queue_exit'
    condition_config JSONB DEFAULT '{}',
    action_type TEXT NOT NULL, -- e.g. 'send_whatsapp'
    action_config JSONB DEFAULT '{}',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members all automation rules"
    ON public.automation_rules FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = automation_rules.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

CREATE TABLE IF NOT EXISTS public.automation_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES public.automation_rules(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- 'success', 'failure'
    error_message TEXT,
    execution_log TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members select automation executions"
    ON public.automation_executions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = automation_executions.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );
