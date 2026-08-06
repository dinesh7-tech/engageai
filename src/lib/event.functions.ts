import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

const getAdminClient = async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
};

// Cryptographically secure or simple random token generator for tickets
function generateTicketToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "TKT-";
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export interface CreateEventInput {
  workspaceId: string;
  name: string;
  venue?: string;
  date?: string;
  categoryId?: string | null;
  subcategory?: string;
  registrationType?: "unlimited" | "capacity";
  capacityLimit?: number | null;
  approvalMode?: "auto" | "manual";
  theme?: string;
  landingPageSections?: string[];
  defaultFields?: any[];
  defaultTickets?: any[];
  status?: string;
}

export const createEvent = createServerFn({ method: "POST" })
  .inputValidator((input: CreateEventInput) => input)
  .handler(async ({ data }) => {
    if (!data || !data.workspaceId) {
      throw new Error("Cannot create event: A valid workspace ID is required.");
    }
    const supabaseAdmin = await getAdminClient();
    console.log("[Event Creation Flow] Step 3: Invoking createEvent() server function. Workspace ID:", data.workspaceId, "Event Name:", data.name);

    // 1. Create the event
    console.log("[Event Creation Flow] Step 4: Executing Supabase insert for event...");
    const { data: event, error: eventErr } = await supabaseAdmin
      .from("events")
      .insert({
        workspace_id: data.workspaceId,
        name: data.name,
        venue: data.venue || "To be announced",
        date: data.date ? new Date(data.date).toISOString() : null,
        status: data.status || "draft",
        category_id: data.categoryId || null,
        subcategory: data.subcategory || null,
        registration_type: data.registrationType || "unlimited",
        capacity_limit: data.capacityLimit || null,
        approval_mode: data.approvalMode || "auto",
        theme: data.theme || "Professional",
        landing_page_sections: data.landingPageSections || ["Banner", "About", "Registration"],
      })
      .select()
      .single();

    if (eventErr) {
      throw new Error(`Failed to create event: ${eventErr.message}`);
    }

    try {
      // 2. Insert Form Fields
      if (data.defaultFields && data.defaultFields.length > 0) {
        const fieldsToInsert = data.defaultFields.map((f, idx) => ({
          workspace_id: data.workspaceId,
          event_id: event.id,
          field_name: f.field_name,
          field_label: f.field_label,
          field_type: f.field_type,
          required: f.required,
          field_options: f.field_options || [],
          conditional_rules: f.conditional_rules || [],
          sort_order: idx
        }));

        const { error: fieldsErr } = await supabaseAdmin
          .from("event_form_fields")
          .insert(fieldsToInsert);

        if (fieldsErr) {
          throw fieldsErr;
        }
      } else {
        // Default fallback contact fields
        const fallbackFields = [
          { workspace_id: data.workspaceId, event_id: event.id, field_name: "name", field_label: "Full Name", field_type: "text", required: true, sort_order: 0 },
          { workspace_id: data.workspaceId, event_id: event.id, field_name: "email", field_label: "Email Address", field_type: "email", required: true, sort_order: 1 },
          { workspace_id: data.workspaceId, event_id: event.id, field_name: "phone", field_label: "WhatsApp Mobile", field_type: "tel", required: true, sort_order: 2 }
        ];
        const { error: fallbackErr } = await supabaseAdmin.from("event_form_fields").insert(fallbackFields);
        if (fallbackErr) throw fallbackErr;
      }

      // 3. Insert Default Ticket Tier
      const ticketTiers = data.defaultTickets || [{ name: "General Admission", ticket_type: "free", price: 0.00 }];
      const ticketsToInsert = ticketTiers.map(t => ({
        workspace_id: data.workspaceId,
        event_id: event.id,
        name: t.name,
        description: t.description || "",
        ticket_type: t.ticket_type || "free",
        price: t.price || 0.00,
        capacity_limit: data.capacityLimit || null
      }));

      const { error: ticketsErr } = await supabaseAdmin
        .from("event_tickets")
        .insert(ticketsToInsert);

      if (ticketsErr) {
        throw ticketsErr;
      }
    } catch (err: any) {
      console.error("[Event Seeding Rollback] Error seeding event, cleaning up draft event record:", err);
      // Clean up the created event
      await supabaseAdmin.from("events").delete().eq("id", event.id);
      throw new Error(`Failed to seed event options: ${err.message || err}`);
    }

    return event;
  });

export const publishEvent = createServerFn({ method: "POST" })
  .inputValidator((input: { eventId: string; workspaceId: string; status: string }) => input)
  .handler(async ({ data }) => {
    if (!data || !data.workspaceId) {
      throw new Error("Cannot publish event: A valid workspace ID is required.");
    }
    const supabaseAdmin = await getAdminClient();
    const { data: event, error } = await supabaseAdmin
      .from("events")
      .update({ status: data.status })
      .eq("id", data.eventId)
      .eq("workspace_id", data.workspaceId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to publish event: ${error.message}`);
    }

    return event;
  });

export interface RegisterAttendeeInput {
  eventId: string;
  workspaceId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  ticketTypeId?: string | null;
  formResponses?: Record<string, any>;
  paymentStatus?: "free" | "pending" | "paid";
  paymentDetails?: any;
}

export const registerAttendee = createServerFn({ method: "POST" })
  .inputValidator((input: RegisterAttendeeInput) => input)
  .handler(async ({ data }) => {
    if (!data || !data.workspaceId) {
      throw new Error("Registration failed: A valid workspace ID is required.");
    }
    const supabaseAdmin = await getAdminClient();

    // Check capacity limit if capacity is checked
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("registration_type, capacity_limit")
      .eq("id", data.eventId)
      .single();

    if (event && event.registration_type === "capacity" && event.capacity_limit) {
      const { count } = await supabaseAdmin
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", data.eventId);

      if (count && count >= event.capacity_limit) {
        throw new Error("Event capacity has been fully booked.");
      }
    }

    const token = generateTicketToken();

    // Use admin client to bypass RLS for public registration insert
    const { data: registration, error } = await supabaseAdmin
      .from("event_registrations")
      .insert({
        event_id: data.eventId,
        workspace_id: data.workspaceId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        ticket_token: token,
        ticket_type_id: data.ticketTypeId || null,
        form_responses: data.formResponses || {},
        payment_status: data.paymentStatus || "free",
        payment_details: data.paymentDetails || {},
        checked_in: false
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }

    // Increment ticket sales
    if (data.ticketTypeId) {
      const { data: ticket } = await supabaseAdmin
        .from("event_tickets")
        .select("quantity_sold")
        .eq("id", data.ticketTypeId)
        .single();
      
      if (ticket) {
        await supabaseAdmin
          .from("event_tickets")
          .update({ quantity_sold: (ticket.quantity_sold || 0) + 1 })
          .eq("id", data.ticketTypeId);
      }
    }

    return registration;
  });

export const checkInAttendee = createServerFn({ method: "POST" })
  .inputValidator((input: { registrationId: string; eventId: string; workspaceId: string; operatorId?: string }) => input)
  .handler(async ({ data }) => {
    if (!data || !data.workspaceId) {
      throw new Error("Check-in failed: A valid workspace ID is required.");
    }
    const supabaseAdmin = await getAdminClient();

    // 1. Update registration checked_in status
    const { error: regErr } = await supabaseAdmin
      .from("event_registrations")
      .update({ checked_in: true, checked_in_at: new Date().toISOString() })
      .eq("id", data.registrationId)
      .eq("event_id", data.eventId);

    if (regErr) {
      throw new Error(`Check-in failed: ${regErr.message}`);
    }

    // 2. Insert checkin record
    await supabaseAdmin
      .from("event_checkins")
      .insert({
        workspace_id: data.workspaceId,
        event_id: data.eventId,
        registration_id: data.registrationId,
        scanned_by: data.operatorId || null
      });

    return { success: true };
  });

export interface LogAnalyticsInput {
  eventId: string;
  workspaceId: string;
  actionType: "view" | "qr_scan" | "registration";
  trafficSource?: string;
  deviceType?: string;
  browser?: string;
  country?: string;
}

export const logEventAnalytics = createServerFn({ method: "POST" })
  .inputValidator((input: LogAnalyticsInput) => input)
  .handler(async ({ data }) => {
    if (!data || !data.workspaceId) {
      throw new Error("Log analytics failed: A valid workspace ID is required.");
    }
    const supabaseAdmin = await getAdminClient();
    
    await supabaseAdmin
      .from("event_analytics")
      .insert({
        workspace_id: data.workspaceId,
        event_id: data.eventId,
        action_type: data.actionType,
        traffic_source: data.trafficSource || "direct",
        device_type: data.deviceType || "desktop",
        browser: data.browser || "unknown",
        country: data.country || "unknown"
      });

    return { success: true };
  });

export const fetchEventAnalytics = createServerFn({ method: "GET" })
  .inputValidator((input: { eventId: string; workspaceId: string }) => input)
  .handler(async ({ data }) => {
    if (!data || !data.workspaceId) {
      throw new Error("Cannot fetch analytics: A valid workspace ID is required.");
    }
    const supabaseAdmin = await getAdminClient();

    const { data: views } = await supabaseAdmin
      .from("event_analytics")
      .select("action_type, traffic_source, device_type, created_at")
      .eq("event_id", data.eventId)
      .eq("workspace_id", data.workspaceId);

    const logs = views || [];
    const totalViews = logs.filter(l => l.action_type === "view").length;
    const totalQRScans = logs.filter(l => l.action_type === "qr_scan").length;
    const totalRegs = logs.filter(l => l.action_type === "registration").length;

    // Traffic sources breakdown
    const sources: Record<string, number> = {};
    // Device types breakdown
    const devices: Record<string, number> = {};

    logs.forEach(l => {
      if (l.action_type === "view") {
        sources[l.traffic_source] = (sources[l.traffic_source] || 0) + 1;
        devices[l.device_type] = (devices[l.device_type] || 0) + 1;
      }
    });

    return {
      views: totalViews,
      qrScans: totalQRScans,
      registrations: totalRegs,
      conversionRate: totalViews > 0 ? Math.round((totalRegs / totalViews) * 100) : 0,
      sources: Object.entries(sources).map(([name, value]) => ({ name, value })),
      devices: Object.entries(devices).map(([name, value]) => ({ name, value }))
    };
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .inputValidator((input: { eventId: string; workspaceId: string }) => input)
  .handler(async ({ data }) => {
    if (!data || !data.workspaceId) {
      throw new Error("Cannot delete event: A valid workspace ID is required.");
    }
    const supabaseAdmin = await getAdminClient();
    const { error } = await supabaseAdmin
      .from("events")
      .delete()
      .eq("id", data.eventId)
      .eq("workspace_id", data.workspaceId);

    if (error) {
      throw new Error(`Failed to delete event: ${error.message}`);
    }
    return { success: true };
  });

export const duplicateEvent = createServerFn({ method: "POST" })
  .inputValidator((input: { eventId: string; workspaceId: string }) => input)
  .handler(async ({ data }) => {
    if (!data || !data.workspaceId) {
      throw new Error("Cannot duplicate event: A valid workspace ID is required.");
    }
    const supabaseAdmin = await getAdminClient();

    // 1. Fetch original event details
    const { data: orig, error: fetchErr } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", data.eventId)
      .single();

    if (fetchErr || !orig) {
      throw new Error(`Failed to fetch original event: ${fetchErr?.message || "Not found"}`);
    }

    // 2. Insert duplicate event
    const { data: newEv, error: insertErr } = await supabaseAdmin
      .from("events")
      .insert({
        workspace_id: data.workspaceId,
        name: `Copy of ${orig.name}`,
        venue: orig.venue,
        date: orig.date,
        status: "draft", // always defaults to draft
        category_id: orig.category_id,
        subcategory: orig.subcategory,
        registration_type: orig.registration_type,
        capacity_limit: orig.capacity_limit,
        approval_mode: orig.approval_mode,
        theme: orig.theme,
        landing_page_sections: orig.landing_page_sections || ["Banner", "About", "Registration"],
        custom_landing_config: orig.custom_landing_config || {}
      })
      .select()
      .single();

    if (insertErr || !newEv) {
      throw new Error(`Failed to duplicate event structure: ${insertErr?.message}`);
    }

    try {
      // 3. Duplicate Form Fields
      const { data: fields } = await supabaseAdmin
        .from("event_form_fields")
        .select("*")
        .eq("event_id", data.eventId);

      if (fields && fields.length > 0) {
        const fieldsToInsert = fields.map((f: any) => ({
          workspace_id: data.workspaceId,
          event_id: newEv.id,
          field_name: f.field_name,
          field_label: f.field_label,
          field_type: f.field_type,
          required: f.required,
          field_options: f.field_options || [],
          conditional_rules: f.conditional_rules || [],
          sort_order: f.sort_order
        }));
        await supabaseAdmin.from("event_form_fields").insert(fieldsToInsert);
      }

      // 4. Duplicate Ticket Tiers
      const { data: tickets } = await supabaseAdmin
        .from("event_tickets")
        .select("*")
        .eq("event_id", data.eventId);

      if (tickets && tickets.length > 0) {
        const ticketsToInsert = tickets.map((t: any) => ({
          workspace_id: data.workspaceId,
          event_id: newEv.id,
          name: t.name,
          description: t.description || "",
          ticket_type: t.ticket_type || "free",
          price: t.price || 0.00,
          capacity_limit: t.capacity_limit
        }));
        await supabaseAdmin.from("event_tickets").insert(ticketsToInsert);
      }
    } catch (err) {
      // Seeding rollback
      await supabaseAdmin.from("events").delete().eq("id", newEv.id);
      throw err;
    }

    return newEv;
  });

export const updateEventDetails = createServerFn({ method: "POST" })
  .inputValidator((input: {
    eventId: string;
    workspaceId: string;
    name: string;
    venue?: string;
    date?: string;
    registrationType?: "unlimited" | "capacity";
    capacityLimit?: number | null;
    approvalMode?: "auto" | "manual";
    theme?: string;
  }) => input)
  .handler(async ({ data }) => {
    if (!data || !data.workspaceId) {
      throw new Error("Cannot update event: A valid workspace ID is required.");
    }
    const supabaseAdmin = await getAdminClient();

    const { data: event, error } = await supabaseAdmin
      .from("events")
      .update({
        name: data.name.trim(),
        venue: data.venue || "To be announced",
        date: data.date ? new Date(data.date).toISOString() : null,
        registration_type: data.registrationType || "unlimited",
        capacity_limit: data.registrationType === "capacity" ? data.capacityLimit : null,
        approval_mode: data.approvalMode || "auto",
        theme: data.theme || "Professional"
      })
      .eq("id", data.eventId)
      .eq("workspace_id", data.workspaceId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update event details: ${error.message}`);
    }
    return event;
  });
