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
  status?: string;
  ipAddress?: string | null;
  deviceInfo?: string | null;
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
        checked_in: false,
        status: data.status || "Pending",
        ip_address: data.ipAddress || null,
        device: data.deviceInfo || null,
        activity_history: [
          {
            activity: "Registered",
            timestamp: new Date().toISOString(),
            details: "Registration submitted online."
          }
        ]
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

    // Fetch existing history to append
    const { data: reg } = await supabaseAdmin
      .from("event_registrations")
      .select("activity_history")
      .eq("id", data.registrationId)
      .single();

    const currentHistory = Array.isArray(reg?.activity_history) ? reg.activity_history : [];
    const nextHistory = [
      ...currentHistory,
      {
        activity: "Checked In",
        timestamp: new Date().toISOString(),
        details: "Attendee checked in at venue."
      }
    ];

    // 1. Update registration checked_in status and status field
    const { error: regErr } = await supabaseAdmin
      .from("event_registrations")
      .update({ 
        checked_in: true, 
        checked_in_at: new Date().toISOString(),
        status: "Checked-in",
        activity_history: nextHistory
      })
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

    const logs: any[] = views || [];
    const totalViews = logs.filter((l: any) => l.action_type === "view").length;
    const totalQRScans = logs.filter((l: any) => l.action_type === "qr_scan").length;
    const totalRegs = logs.filter((l: any) => l.action_type === "registration").length;

    // Traffic sources breakdown
    const sources: Record<string, number> = {};
    // Device types breakdown
    const devices: Record<string, number> = {};

    logs.forEach((l: any) => {
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

export const approveRegistration = createServerFn({ method: "POST" })
  .inputValidator((input: { registrationId: string; eventId: string; workspaceId: string }) => input)
  .handler(async ({ data }) => {
    if (!data || !data.workspaceId) {
      throw new Error("Approval failed: A valid workspace ID is required.");
    }
    const supabaseAdmin = await getAdminClient();

    // Fetch registration details
    const { data: reg, error: fetchErr } = await supabaseAdmin
      .from("event_registrations")
      .select("*, events(name, date, venue)")
      .eq("id", data.registrationId)
      .single();

    if (fetchErr || !reg) {
      throw new Error(`Failed to load registration details: ${fetchErr?.message || "Not found"}`);
    }

    const currentHistory = Array.isArray(reg.activity_history) ? reg.activity_history : [];
    const nextHistory = [
      ...currentHistory,
      {
        activity: "Approved",
        timestamp: new Date().toISOString(),
        details: "Registration approved by organizer."
      }
    ];

    // Update status
    const { error: updateErr } = await supabaseAdmin
      .from("event_registrations")
      .update({
        status: "Approved",
        activity_history: nextHistory
      })
      .eq("id", data.registrationId);

    if (updateErr) {
      throw new Error(`Failed to update approval status: ${updateErr.message}`);
    }

    // Trigger WhatsApp Automations if phone number is provided
    if (reg.phone) {
      try {
        const eventName = reg.events?.name || "Event";
        const eventDate = reg.events?.date 
          ? new Date(reg.events.date).toLocaleString() 
          : "TBD";
        const eventVenue = reg.events?.venue || "TBD";
        
        const ticketLink = typeof window !== "undefined" 
          ? `${window.location.origin}/ticket/${reg.ticket_token}` 
          : `https://engageai-gold.vercel.app/ticket/${reg.ticket_token}`;

        const { dispatchWhatsApp } = await import("./whatsapp-client");
        await dispatchWhatsApp({
          to: reg.phone,
          recipient: reg.name,
          templateId: "event_registration",
          variables: {
            name: reg.name,
            event: eventName,
            date: eventDate,
            venue: eventVenue,
            link: ticketLink
          },
          workspaceId: data.workspaceId,
          notify: false
        });

        // Add "WhatsApp Sent" to timeline
        const updatedHistory = [
          ...nextHistory,
          {
            activity: "WhatsApp Sent",
            timestamp: new Date().toISOString(),
            details: `WhatsApp confirmation dispatched to ${reg.phone}`
          }
        ];
        await supabaseAdmin
          .from("event_registrations")
          .update({ activity_history: updatedHistory })
          .eq("id", data.registrationId);

      } catch (err: any) {
        console.error("Failed to send WhatsApp automation on approval:", err);
      }
    }

    // Add Email Sent timeline log (simulated)
    try {
      const { data: latestReg } = await supabaseAdmin
        .from("event_registrations")
        .select("activity_history")
        .eq("id", data.registrationId)
        .single();
      const latestHistory = Array.isArray(latestReg?.activity_history) ? latestReg.activity_history : nextHistory;
      
      const emailHistory = [
        ...latestHistory,
        {
          activity: "Email Sent",
          timestamp: new Date().toISOString(),
          details: `Email confirmation simulated to ${reg.email || "attendee"}`
        },
        {
          activity: "QR Generated",
          timestamp: new Date().toISOString(),
          details: `Check-in QR ticket generated: ${reg.ticket_token}`
        }
      ];
      await supabaseAdmin
        .from("event_registrations")
        .update({ activity_history: emailHistory })
        .eq("id", data.registrationId);
    } catch (e) {
      console.error("Timeline update failed:", e);
    }

    return { success: true };
  });

export const rejectRegistration = createServerFn({ method: "POST" })
  .inputValidator((input: { registrationId: string; eventId: string; workspaceId: string; reason?: string }) => input)
  .handler(async ({ data }) => {
    if (!data || !data.workspaceId) {
      throw new Error("Rejection failed: A valid workspace ID is required.");
    }
    const supabaseAdmin = await getAdminClient();

    const { data: reg } = await supabaseAdmin
      .from("event_registrations")
      .select("activity_history, email, phone, name")
      .eq("id", data.registrationId)
      .single();

    const currentHistory = Array.isArray(reg?.activity_history) ? reg.activity_history : [];
    const nextHistory = [
      ...currentHistory,
      {
        activity: "Rejected",
        timestamp: new Date().toISOString(),
        details: data.reason ? `Rejection reason: ${data.reason}` : "Rejected by organizer."
      }
    ];

    const { error } = await supabaseAdmin
      .from("event_registrations")
      .update({
        status: "Rejected",
        rejection_reason: data.reason || null,
        activity_history: nextHistory
      })
      .eq("id", data.registrationId);

    if (error) {
      throw new Error(`Failed to update rejection status: ${error.message}`);
    }

    // Simulate rejection alert dispatch (WhatsApp/Email)
    if (reg?.phone || reg?.email) {
      try {
        const contact = reg.phone || reg.email || "attendee";
        const emailHistory = [
          ...nextHistory,
          {
            activity: "Rejection Notification Sent",
            timestamp: new Date().toISOString(),
            details: `Rejection email/WhatsApp simulated to ${contact}`
          }
        ];
        await supabaseAdmin
          .from("event_registrations")
          .update({ activity_history: emailHistory })
          .eq("id", data.registrationId);
      } catch (e) {
        console.error("Timeline reject update failed:", e);
      }
    }

    return { success: true };
  });

export const deleteRegistration = createServerFn({ method: "POST" })
  .inputValidator((input: { registrationId: string; eventId: string; workspaceId: string }) => input)
  .handler(async ({ data }) => {
    if (!data || !data.workspaceId) {
      throw new Error("Delete failed: A valid workspace ID is required.");
    }
    const supabaseAdmin = await getAdminClient();
    const { error } = await supabaseAdmin
      .from("event_registrations")
      .delete()
      .eq("id", data.registrationId)
      .eq("workspace_id", data.workspaceId);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
    return { success: true };
  });

export const updateRegistrationNotes = createServerFn({ method: "POST" })
  .inputValidator((input: { registrationId: string; eventId: string; workspaceId: string; notes: string }) => input)
  .handler(async ({ data }) => {
    if (!data || !data.workspaceId) {
      throw new Error("Update notes failed: A valid workspace ID is required.");
    }
    const supabaseAdmin = await getAdminClient();
    
    const { data: reg } = await supabaseAdmin
      .from("event_registrations")
      .select("activity_history")
      .eq("id", data.registrationId)
      .single();

    const currentHistory = Array.isArray(reg?.activity_history) ? reg.activity_history : [];
    const nextHistory = [
      ...currentHistory,
      {
        activity: "Notes Updated",
        timestamp: new Date().toISOString(),
        details: "Internal notes modified."
      }
    ];

    const { error } = await supabaseAdmin
      .from("event_registrations")
      .update({
        notes: data.notes,
        activity_history: nextHistory
      })
      .eq("id", data.registrationId);

    if (error) {
      throw new Error(`Failed to update internal notes: ${error.message}`);
    }
    return { success: true };
  });

export const updateRegistrationDetails = createServerFn({ method: "POST" })
  .inputValidator((input: { registrationId: string; eventId: string; workspaceId: string; name: string; email?: string | null; phone?: string | null; ticketTypeId?: string | null; formResponses?: any }) => input)
  .handler(async ({ data }) => {
    if (!data || !data.workspaceId) {
      throw new Error("Update details failed: A valid workspace ID is required.");
    }
    const supabaseAdmin = await getAdminClient();
    
    const { data: reg } = await supabaseAdmin
      .from("event_registrations")
      .select("activity_history")
      .eq("id", data.registrationId)
      .single();

    const currentHistory = Array.isArray(reg?.activity_history) ? reg.activity_history : [];
    const nextHistory = [
      ...currentHistory,
      {
        activity: "Details Edited",
        timestamp: new Date().toISOString(),
        details: "Contact information updated by manager."
      }
    ];

    const updatePayload: any = {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      activity_history: nextHistory
    };

    if (data.ticketTypeId !== undefined) {
      updatePayload.ticket_type_id = data.ticketTypeId;
    }
    if (data.formResponses !== undefined) {
      updatePayload.form_responses = data.formResponses;
    }

    const { error } = await supabaseAdmin
      .from("event_registrations")
      .update(updatePayload)
      .eq("id", data.registrationId);

    if (error) {
      throw new Error(`Failed to update registration details: ${error.message}`);
    }
    return { success: true };
  });

export const bulkApproveRegistrations = createServerFn({ method: "POST" })
  .inputValidator((input: { registrationIds: string[]; eventId: string; workspaceId: string }) => input)
  .handler(async ({ data }) => {
    if (!data || !data.workspaceId) {
      throw new Error("Bulk approval failed: A valid workspace ID is required.");
    }
    
    for (const regId of data.registrationIds) {
      await approveRegistration({
        data: {
          registrationId: regId,
          eventId: data.eventId,
          workspaceId: data.workspaceId
        }
      });
    }

    return { success: true };
  });

export const bulkRejectRegistrations = createServerFn({ method: "POST" })
  .inputValidator((input: { registrationIds: string[]; eventId: string; workspaceId: string; reason?: string }) => input)
  .handler(async ({ data }) => {
    if (!data || !data.workspaceId) {
      throw new Error("Bulk rejection failed: A valid workspace ID is required.");
    }
    
    for (const regId of data.registrationIds) {
      await rejectRegistration({
        data: {
          registrationId: regId,
          eventId: data.eventId,
          workspaceId: data.workspaceId,
          reason: data.reason || ""
        }
      });
    }

    return { success: true };
  });

export const bulkDeleteRegistrations = createServerFn({ method: "POST" })
  .inputValidator((input: { registrationIds: string[]; eventId: string; workspaceId: string }) => input)
  .handler(async ({ data }) => {
    if (!data || !data.workspaceId) {
      throw new Error("Bulk deletion failed: A valid workspace ID is required.");
    }
    const supabaseAdmin = await getAdminClient();
    const { error } = await supabaseAdmin
      .from("event_registrations")
      .delete()
      .in("id", data.registrationIds)
      .eq("workspace_id", data.workspaceId);

    if (error) {
      throw new Error(`Bulk delete failed: ${error.message}`);
    }
    return { success: true };
  });

export const getRegistrationByToken = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    const supabaseAdmin = await getAdminClient();
    const { data: reg, error } = await supabaseAdmin
      .from("event_registrations")
      .select("*")
      .eq("ticket_token", data.token)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to retrieve registration: ${error.message}`);
    }
    return reg;
  });

export const updateRegistrationByToken = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; name: string; email?: string | null; phone?: string | null }) => input)
  .handler(async ({ data }) => {
    const supabaseAdmin = await getAdminClient();
    
    const { data: reg } = await supabaseAdmin
      .from("event_registrations")
      .select("id, activity_history")
      .eq("ticket_token", data.token)
      .single();

    if (!reg) {
      throw new Error("Ticket not found.");
    }

    const currentHistory = Array.isArray(reg.activity_history) ? reg.activity_history : [];
    const nextHistory = [
      ...currentHistory,
      {
        activity: "Details Updated",
        timestamp: new Date().toISOString(),
        details: "Contact details updated online by ticket holder."
      }
    ];

    const { data: updated, error } = await supabaseAdmin
      .from("event_registrations")
      .update({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        activity_history: nextHistory
      })
      .eq("id", reg.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update ticket: ${error.message}`);
    }
    return updated;
  });

export const cancelRegistrationByToken = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    const supabaseAdmin = await getAdminClient();
    
    const { data: reg } = await supabaseAdmin
      .from("event_registrations")
      .select("id")
      .eq("ticket_token", data.token)
      .single();

    if (!reg) {
      throw new Error("Ticket not found.");
    }

    const { error } = await supabaseAdmin
      .from("event_registrations")
      .delete()
      .eq("id", reg.id);

    if (error) {
      throw new Error(`Cancellation failed: ${error.message}`);
    }
    return { success: true };
  });

export const checkInAttendeeByQR = createServerFn({ method: "POST" })
  .inputValidator((input: { qrPayload: string; eventId: string; workspaceId: string; operatorId?: string }) => input)
  .handler(async ({ data }) => {
    if (!data || !data.workspaceId || !data.eventId) {
      return { status: "INVALID", message: "Check-in failed: Valid workspace and event IDs are required." };
    }
    const supabaseAdmin = await getAdminClient();

    let payload: any = null;
    let ticketToken = data.qrPayload.trim();
    let registrationId: string | null = null;
    let payloadEventId: string | null = null;
    let checksum: string | null = null;

    try {
      if (data.qrPayload.trim().startsWith("{")) {
        payload = JSON.parse(data.qrPayload);
        if (payload.token) ticketToken = payload.token;
        if (payload.registrationId) registrationId = payload.registrationId;
        if (payload.attendeeId) registrationId = payload.attendeeId;
        if (payload.eventId) payloadEventId = payload.eventId;
        if (payload.checksum) checksum = payload.checksum;
      }
    } catch (e) {
      // Plain text token fallback
    }

    // Verify Event mismatch if embedded in payload
    if (payloadEventId && payloadEventId !== data.eventId) {
      return {
        status: "INVALID",
        message: "Wrong Event: This ticket was issued for a different event."
      };
    }

    // Lookup registration
    let query = supabaseAdmin
      .from("event_registrations")
      .select("*, events(name)")
      .eq("event_id", data.eventId);

    if (registrationId) {
      query = query.eq("id", registrationId);
    } else {
      query = query.eq("ticket_token", ticketToken);
    }

    const { data: reg, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !reg) {
      return {
        status: "INVALID",
        message: "Invalid Ticket: No registration found for this QR token."
      };
    }

    // Verify Checksum if present
    if (checksum) {
      const expectedChecksum = Buffer.from(`${reg.id}:${reg.event_id}:${reg.ticket_token}`).toString("base64").slice(0, 12);
      if (checksum !== expectedChecksum) {
        return {
          status: "INVALID",
          message: "Tampered QR Code: Checksum verification failed."
        };
      }
    }

    // Status checks
    if (reg.status === "Pending") {
      return {
        status: "PENDING",
        message: "Pending Approval: This ticket is awaiting organizer approval.",
        attendee: reg
      };
    }

    if (reg.status === "Rejected") {
      return {
        status: "REJECTED",
        message: "Registration Declined: This ticket has been rejected and disabled.",
        attendee: reg
      };
    }

    if (reg.checked_in || reg.status === "Checked-in") {
      return {
        status: "ALREADY_CHECKED_IN",
        message: `Already Checked-in: ${reg.name} was checked in on ${reg.checked_in_at ? new Date(reg.checked_in_at).toLocaleTimeString() : 'earlier'}.`,
        attendee: reg,
        alreadyCheckedIn: true
      };
    }

    // Perform check-in update
    const currentHistory = Array.isArray(reg.activity_history) ? reg.activity_history : [];
    const nextHistory = [
      ...currentHistory,
      {
        activity: "Checked In via QR Camera Scan",
        timestamp: new Date().toISOString(),
        details: "Scanned & verified at entrance."
      }
    ];

    const now = new Date().toISOString();
    const { error: updateErr } = await supabaseAdmin
      .from("event_registrations")
      .update({
        checked_in: true,
        checked_in_at: now,
        status: "Checked-in",
        activity_history: nextHistory
      })
      .eq("id", reg.id);

    if (updateErr) {
      return {
        status: "INVALID",
        message: `Check-in update failed: ${updateErr.message}`
      };
    }

    // Log checkin event
    await supabaseAdmin
      .from("event_checkins")
      .insert({
        workspace_id: data.workspaceId,
        event_id: data.eventId,
        registration_id: reg.id,
        scanned_by: data.operatorId || null
      });

    return {
      status: "VALID",
      message: "✓ Successfully Checked In!",
      attendee: { ...reg, checked_in: true, checked_in_at: now, status: "Checked-in" },
      alreadyCheckedIn: false
    };
  });

