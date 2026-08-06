-- Alter events_status_check check constraint to include 'archived'
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE public.events ADD CONSTRAINT events_status_check CHECK (
  status IN ('draft', 'published', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled', 'expired', 'upcoming', 'live', 'archived')
);
