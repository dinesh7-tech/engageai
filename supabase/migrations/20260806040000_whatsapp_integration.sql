-- Create WhatsApp configs table for workspace override keys
CREATE TABLE IF NOT EXISTS public.whatsapp_configs (
  workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  access_token TEXT,
  phone_number_id TEXT,
  business_account_id TEXT,
  verify_token TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.whatsapp_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members all on whatsapp_configs" ON public.whatsapp_configs
  FOR ALL USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

-- Create WhatsApp messages table
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'template', 'image', 'document')),
  message JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'received', 'simulated')),
  meta_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members select on whatsapp_messages" ON public.whatsapp_messages
  FOR SELECT USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Allow members insert on whatsapp_messages" ON public.whatsapp_messages
  FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Allow members update on whatsapp_messages" ON public.whatsapp_messages
  FOR UPDATE USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "Allow members delete on whatsapp_messages" ON public.whatsapp_messages
  FOR DELETE USING (public.is_workspace_member(workspace_id));
