import { createServerFn } from "@tanstack/react-start";

export interface ModuleKPIs {
  queueai: {
    waiting: number;
    serving: number;
    avgWait: number;
    exitRate: number;
    todayVisitors: number;
    status: "Active" | "Inactive";
    health: "healthy" | "warning" | "error";
  };
  eventai: {
    activeEvent: string | null;
    registrations: number;
    attendance: number;
    feedbackRate: number;
    certificates: number;
    announcements: number;
    status: "Active" | "Inactive";
    health: "healthy" | "warning" | "error";
  };
  feedbackai: {
    received: number;
    pending: number;
    rating: number;
    sentiment: number; // 0-100
    responseRate: number;
    status: "Active" | "Inactive";
    health: "healthy" | "warning" | "error";
  };
}

export interface WorkspaceMetrics {
  businessScore: number;
  healthBreakdown: {
    automation: number;
    satisfaction: number;
    responseTime: number;
    queueEfficiency: number;
    feedbackCompletion: number;
    aiUsage: number;
  };
  highlights: string[];
  attentionAlerts: {
    id: string;
    severity: "error" | "warning" | "success" | "info";
    text: string;
  }[];
  predictions: {
    expectedQueueLength: number;
    expectedRegistrations: number;
    expectedFeedbackRate: number;
    churnRisk: number;
    peakHours: string;
  };
  recentAutomations: {
    id: string;
    name: string;
    workflow: string;
    status: "success" | "pending" | "failed";
    time: string;
  }[];
  recentReports: {
    id: string;
    title: string;
    type: string;
    date: string;
  }[];
  teamMembers: {
    id: string;
    name: string;
    role: string;
    online: boolean;
    avatar: string;
  }[];
  kpis: ModuleKPIs;
  timeline: {
    id: string;
    time: string;
    module: "QueueAI" | "EventAI" | "FeedbackAI" | "Automation";
    text: string;
    type: "info" | "success" | "warning" | "error";
  }[];
}

export function buildDefaultMetrics(workspaceId: string): WorkspaceMetrics {
  return {
    businessScore: 100,
    healthBreakdown: {
      automation: 100,
      satisfaction: 100,
      responseTime: 100,
      queueEfficiency: 100,
      feedbackCompletion: 100,
      aiUsage: 100,
    },
    highlights: [
      "No queues active today.",
      "Get started by setting up QueueAI or logging feedback.",
    ],
    attentionAlerts: [],
    predictions: {
      expectedQueueLength: 0,
      expectedRegistrations: 0,
      expectedFeedbackRate: 100,
      churnRisk: 0,
      peakHours: "N/A",
    },
    recentAutomations: [],
    recentReports: [],
    teamMembers: [],
    kpis: {
      queueai: {
        waiting: 0,
        serving: 0,
        avgWait: 0,
        exitRate: 0,
        todayVisitors: 0,
        status: "Inactive",
        health: "healthy",
      },
      eventai: {
        activeEvent: null,
        registrations: 0,
        attendance: 0,
        feedbackRate: 0,
        certificates: 0,
        announcements: 0,
        status: "Inactive",
        health: "healthy",
      },
      feedbackai: {
        received: 0,
        pending: 0,
        rating: 0,
        sentiment: 100,
        responseRate: 0,
        status: "Inactive",
        health: "healthy",
      },
    },
    timeline: [],
  };
}

export const getWorkspaceMetrics = createServerFn({ method: "POST" })
  .validator((input: { workspaceId: string }) => input)
  .handler(async ({ data }): Promise<WorkspaceMetrics> => {
    let workspaceId = "ws_1";
    try { workspaceId = (data as any)?.workspaceId || "ws_1"; } catch (_) {}

    const result = buildDefaultMetrics(workspaceId);

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Query real DB metrics
      const [
        queueRes,
        eventRes,
        feedbackRes,
        activitiesRes,
        notificationsRes
      ] = await Promise.allSettled([
        supabaseAdmin.from("queue_entries").select("*").eq("workspace_id", workspaceId),
        supabaseAdmin.from("events").select("*").eq("workspace_id", workspaceId),
        supabaseAdmin.from("feedback_entries").select("*").eq("workspace_id", workspaceId),
        supabaseAdmin.from("activity_events").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(6),
        supabaseAdmin.from("notifications").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(6),
      ]);

      // Process Queue metrics
      if (queueRes.status === "fulfilled" && queueRes.value.data) {
        const qData = queueRes.value.data;
        const waiting = qData.filter(q => q.status === "waiting").length;
        const serving = qData.filter(q => q.status === "serving").length;
        const exited = qData.filter(q => q.status === "exited").length;
        const completed = qData.filter(q => q.status === "completed").length;

        result.kpis.queueai.waiting = waiting;
        result.kpis.queueai.serving = serving;
        result.kpis.queueai.todayVisitors = qData.length;
        result.kpis.queueai.exitRate = qData.length > 0 ? Math.round((exited / qData.length) * 100) : 0;
        result.kpis.queueai.status = qData.length > 0 ? "Active" : "Inactive";
        result.kpis.queueai.avgWait = waiting * 10; // Simple simulation based on active line size
      }

      // Process Event metrics
      if (eventRes.status === "fulfilled" && eventRes.value.data) {
        const eData = eventRes.value.data;
        result.kpis.eventai.status = eData.length > 0 ? "Active" : "Inactive";
        const liveEvent = eData.find(e => e.status === "live");
        result.kpis.eventai.activeEvent = liveEvent ? liveEvent.name : (eData[0]?.name || null);

        // Load registrations for active event if it exists
        if (eData.length > 0) {
          const activeId = liveEvent ? liveEvent.id : eData[0]!.id;
          const { data: regs } = await supabaseAdmin.from("event_registrations").select("*").eq("event_id", activeId);
          if (regs) {
            result.kpis.eventai.registrations = regs.length;
            const attendees = regs.filter(r => r.checked_in).length;
            result.kpis.eventai.attendance = attendees;
            result.kpis.eventai.feedbackRate = regs.length > 0 ? Math.round((attendees / regs.length) * 100) : 0;
            result.kpis.eventai.certificates = Math.round(attendees * 0.9);
          }
        }
      }

      // Process Feedback metrics
      if (feedbackRes.status === "fulfilled" && feedbackRes.value.data) {
        const fData = feedbackRes.value.data;
        const totalRating = fData.reduce((acc, f) => acc + (f.rating || 0), 0);
        const rating = fData.length > 0 ? Math.round((totalRating / fData.length) * 10) / 10 : 0;
        const positive = fData.filter(f => f.sentiment === "positive").length;

        result.kpis.feedbackai.received = fData.length;
        result.kpis.feedbackai.pending = fData.filter(f => f.status === "pending").length;
        result.kpis.feedbackai.rating = rating;
        result.kpis.feedbackai.sentiment = fData.length > 0 ? Math.round((positive / fData.length) * 100) : 100;
        result.kpis.feedbackai.status = fData.length > 0 ? "Active" : "Inactive";
      }

      // Build real Business Health score based on metrics
      let health = 100;
      if (result.kpis.queueai.exitRate > 15) health -= 10;
      if (result.kpis.feedbackai.rating > 0 && result.kpis.feedbackai.rating < 4.0) health -= 15;
      result.businessScore = Math.max(0, health);

      // Process timeline & alerts
      if (activitiesRes.status === "fulfilled" && activitiesRes.value.data && activitiesRes.value.data.length > 0) {
        result.timeline = activitiesRes.value.data.map((act) => {
          let mod: "QueueAI" | "EventAI" | "FeedbackAI" | "Automation" = "Automation";
          if (act.actor?.toLowerCase().includes("queue")) mod = "QueueAI";
          else if (act.actor?.toLowerCase().includes("event")) mod = "EventAI";
          else if (act.actor?.toLowerCase().includes("feedback")) mod = "FeedbackAI";

          const minsDiff = Math.max(1, Math.floor((Date.now() - new Date(act.created_at).getTime()) / 60000));
          const timeStr = minsDiff < 60 ? `${minsDiff}m ago` : `${Math.floor(minsDiff / 60)}h ago`;

          return {
            id: act.id,
            time: timeStr,
            module: mod,
            text: act.text || "",
            type: ((act.text || "").toLowerCase().includes("negative") || (act.text || "").toLowerCase().includes("exit")
              ? "warning" : "info") as "info" | "success" | "warning" | "error",
          };
        });
      }

      if (notificationsRes.status === "fulfilled" && notificationsRes.value.data && notificationsRes.value.data.length > 0) {
        result.attentionAlerts = notificationsRes.value.data.map((notif) => {
          let severity: "error" | "warning" | "success" | "info" = "info";
          if (notif.severity === "destructive") severity = "error";
          else if (notif.severity === "warning") severity = "warning";
          else if (notif.severity === "success") severity = "success";

          return {
            id: notif.id,
            severity,
            text: `${notif.title}: ${notif.body}`,
          };
        });
      }

      // Populate highlights dynamically based on current metrics
      result.highlights = [];
      if (result.kpis.queueai.todayVisitors > 0) {
        result.highlights.push(`${result.kpis.queueai.todayVisitors} customers checked in today.`);
      }
      if (result.kpis.feedbackai.received > 0) {
        result.highlights.push(`Feedback rating average is at ${result.kpis.feedbackai.rating} ★.`);
      }
      if (result.highlights.length === 0) {
        result.highlights = ["Platform initialized. Ready to process customers."];
      }

    } catch (dbError: any) {
      console.warn("[WorkspaceMetrics] Supabase unavailable, serving defaults:", dbError?.message || dbError);
    }

    return result;
  });
