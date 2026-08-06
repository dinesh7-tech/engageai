-- Alter public.whatsapp_configs to add multi-tenant and secure onboarding fields
ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS app_id text;
ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS app_secret text;
ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS webhook_status text DEFAULT 'disconnected';
ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending';

-- Add check constraints to status fields to ensure validity
ALTER TABLE public.whatsapp_configs DROP CONSTRAINT IF EXISTS whatsapp_configs_webhook_status_check;
ALTER TABLE public.whatsapp_configs ADD CONSTRAINT whatsapp_configs_webhook_status_check CHECK (
  webhook_status IN ('connected', 'disconnected')
);

ALTER TABLE public.whatsapp_configs DROP CONSTRAINT IF EXISTS whatsapp_configs_verification_status_check;
ALTER TABLE public.whatsapp_configs ADD CONSTRAINT whatsapp_configs_verification_status_check CHECK (
  verification_status IN ('verified', 'pending', 'failed')
);
