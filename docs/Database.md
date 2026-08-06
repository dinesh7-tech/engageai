# Database Schema & Security Models

EngageAI runs on a Supabase (PostgreSQL) backend. All tables are protected by Row Level Security (RLS) policies to guarantee multi-tenant security.

---

## 1. Schema Tables

### Core Tenant Layer
- **`profiles`**: User metadata mapped directly to Supabase Auth `users.id`.
- **`workspaces`**: Workspace definition holding company metadata, slug, and configurations.
- **`workspace_members`**: Intermediate mapping tying users to workspaces with specific roles (`owner`, `operator`).

### Application Features
- **`queue_entries`**: Tracks customer ticket numbers, waitlist queue slots, and check-in times.
- **`events`**: Event information (venue, dates) for the EventAI check-in engine.
- **`event_registrations`**: Attendee listings indicating RSVP status and check-in indicators.
- **`feedback_entries`**: Customer satisfaction logs holding review scores, sentiment analysis labels, and channels.

### System Infrastructure
- **`automation_rules`**: User-defined automation flows tying triggers (e.g. `Queue Joined`) to actions (e.g. `WhatsApp`).
- **`whatsapp_configs`**: Multi-tenant workspace token configurations.
- **`whatsapp_messages`**: Outbox & inbound logs audits.

---

## 2. Row Level Security (RLS)

All tables use a custom utility function to authenticate workspace access:

```sql
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Policy Examples
- **Read / Write Permission**:
  ```sql
  CREATE POLICY "Members have full access" ON public.queue_entries
    FOR ALL
    USING (public.is_workspace_member(workspace_id));
  ```
