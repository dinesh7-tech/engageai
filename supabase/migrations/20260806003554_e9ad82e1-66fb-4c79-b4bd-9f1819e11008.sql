CREATE TABLE public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL DEFAULT 'ws_1',
  actor text NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.activity_events TO anon;
GRANT SELECT ON public.activity_events TO authenticated;
GRANT ALL ON public.activity_events TO service_role;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Activity is publicly readable" ON public.activity_events FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL DEFAULT 'ws_1',
  title text NOT NULL,
  body text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notifications TO anon;
GRANT SELECT ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notifications are publicly readable" ON public.notifications FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX activity_events_created_at_idx ON public.activity_events (workspace_id, created_at DESC);
CREATE INDEX notifications_created_at_idx ON public.notifications (workspace_id, created_at DESC);

ALTER TABLE public.activity_events REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

INSERT INTO public.notifications (workspace_id, title, body, severity, created_at) VALUES
 ('ws_1','Queue exit rate spike','Exit rate at Bandra branch rose to 18% in the last hour.','warning', now() - interval '5 minutes'),
 ('ws_1','Certificate batch ready','412 certificates generated for Product Summit 2026.','success', now() - interval '24 minutes'),
 ('ws_1','Negative feedback escalated','3 complaints tagged "Billing" require a response.','destructive', now() - interval '1 hour'),
 ('ws_1','Automation published','Feedback reminder flow v3 is now live.','info', now() - interval '1 day'),
 ('ws_1','New teammate joined','priya@novasalon.com accepted the workspace invite.','info', now() - interval '2 days');

INSERT INTO public.activity_events (workspace_id, actor, text, created_at) VALUES
 ('ws_1','QueueAI','14 customers joined the Andheri branch queue', now() - interval '2 minutes'),
 ('ws_1','FeedbackAI','Negative sentiment detected in 3 new responses', now() - interval '18 minutes'),
 ('ws_1','EventAI','Product Summit check-in crossed 400 attendees', now() - interval '41 minutes'),
 ('ws_1','Automation','"You''re next" WhatsApp flow ran 128 times', now() - interval '1 hour'),
 ('ws_1','QueueAI','Peak hour prediction updated for tomorrow', now() - interval '3 hours');