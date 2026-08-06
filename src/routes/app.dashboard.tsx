import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  Blocks,
  CalendarPlus,
  Gauge,
  MessageSquarePlus,
  QrCode,
  Sparkles,
  Users2,
  CalendarDays,
  PenSquare,
  Wand2,
} from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { ChartCard } from "@/components/app/ChartCard";
import { CopilotPanel } from "@/components/app/CopilotPanel";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeActivity, useRealtimeNotifications, relativeTime } from "@/hooks/useRealtimeFeed";
import { getWorkspaceMetrics, buildDefaultMetrics, WorkspaceMetrics } from "@/lib/metrics.functions";
import { FadeUp, Stagger } from "@/components/motion/primitives";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({
    meta: [
      { title: "Workspace Dashboard — EngageAI" },
      { name: "description", content: "Live view of queues, events, feedback and automations across your EngageAI workspace." },
    ],
  }),
  component: DashboardPage,
});

const quickActions = [
  { label: "Generate queue QR", icon: QrCode, to: "/app/queueai" as const },
  { label: "Create event", icon: CalendarPlus, to: "/app/eventai" as const },
  { label: "Send feedback request", icon: MessageSquarePlus, to: "/app/feedbackai" as const },
  { label: "Build automation", icon: Activity, to: "/app/automation" as const },
];

function DashboardPage() {
  const { activeWorkspace } = useActiveWorkspace();
  const { profile, user } = useAuth();
  const { events, loading: activityLoading } = useRealtimeActivity();
  const { unreadCount } = useRealtimeNotifications();

  const [metrics, setMetrics] = useState<WorkspaceMetrics>(() => buildDefaultMetrics(activeWorkspace?.id || "ws_1"));
  const [metricsLoading, setMetricsLoading] = useState(true);

  const businessName = activeWorkspace?.name || "Workspace";
  const userName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  useEffect(() => {
    if (!activeWorkspace?.id) return;
    setMetricsLoading(true);
    getWorkspaceMetrics({ data: { workspaceId: activeWorkspace?.id } })
      .then((res) => setMetrics(res))
      .catch(() => {})
      .finally(() => setMetricsLoading(false));
  }, [activeWorkspace?.id]);

  return (
    <div className="space-y-10">
      {/* Welcome Hero */}
      <FadeUp className="shadow-float relative overflow-hidden rounded-[28px] border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-8 sm:p-12">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-[420px] rounded-full bg-white/[0.03] blur-[100px]" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white/60">
              <Sparkles className="size-3" /> EngageAI Workspace
            </div>
            <h1 className="font-display mt-5 text-balance text-4xl font-semibold tracking-[-0.035em] text-white sm:text-6xl">
              Hello, <span className="text-gradient">{userName}.</span>
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/60">
              Welcome to <strong className="text-white font-medium">{businessName}</strong>. Your queues, events, and WhatsApp automations are operating seamlessly.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]">
              <Link to="/app/analytics"><CalendarDays className="size-4" /> Analytics</Link>
            </Button>
            <Button asChild className="h-11 rounded-xl bg-white text-black hover:bg-white/90">
              <Link to="/app/copilot">
                <Wand2 className="size-4" /> Ask Copilot
              </Link>
            </Button>
          </div>
        </div>
      </FadeUp>

      {/* KPI Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Active modules", value: "3", delta: "100%", hint: "active", icon: Blocks },
          { label: "Customers today", value: String(metrics.kpis.queueai.todayVisitors), delta: "+12%", hint: "visitors today", icon: Users2 },
          { label: "Unread alerts", value: String(unreadCount), hint: "live notifications", icon: Bell },
          { label: "Workspace health", value: `${metrics.businessScore}%`, delta: "+4%", hint: "system status", icon: Gauge },
        ].map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Platform Overview"
          subtitle="Real-time live queue volume and active operations"
        >
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] py-16 text-center">
            <Activity className="size-6 text-white/40" />
            <p className="mt-3 text-sm font-medium text-white">Live timeline active</p>
            <p className="mt-1 max-w-xs text-xs text-white/50">
              Check-ins, event registrations, and WhatsApp replies will populate here.
            </p>
          </div>
        </ChartCard>

        <div className="space-y-6">
          <ChartCard title="Quick actions" subtitle="Jump straight into a workflow">
            <div className="grid gap-2">
              {quickActions.map((a) => (
                <Link
                  key={a.label}
                  to={a.to}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white transition-colors hover:bg-white/[0.06]"
                >
                  <a.icon className="size-4 text-white/80" />
                  <span>{a.label}</span>
                  <ArrowRight className="ml-auto size-4 text-white/40" />
                </Link>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Module status" subtitle="Operational health">
            <div className="space-y-4">
              {[
                { name: "QueueAI", usage: metrics.kpis.queueai.status === "Active" ? 100 : 0 },
                { name: "EventAI", usage: metrics.kpis.eventai.status === "Active" ? 100 : 0 },
                { name: "FeedbackAI", usage: metrics.kpis.feedbackai.status === "Active" ? 100 : 0 },
              ].map((m) => (
                <div key={m.name}>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-white/70">
                    <span className="font-medium text-white">{m.name}</span>
                    <span className="text-white/45">{m.usage > 0 ? "Active" : "Inactive"}</span>
                  </div>
                  <Progress value={m.usage} className="h-1.5 bg-white/10" />
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>

      <CopilotPanel />

      <ChartCard title="Recent activity" subtitle="Live feed across your modules">
        {activityLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-white/[0.04]" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="py-12 text-center text-sm text-white/50">
            No activity logged in this workspace yet.
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {events.map((a) => (
              <li key={a.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <Badge variant="secondary" className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] text-white/70">
                  {a.actor}
                </Badge>
                <p className="min-w-0 flex-1 truncate text-sm text-white/80">{a.text}</p>
                <span className="shrink-0 font-mono text-xs text-white/40">{relativeTime(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </ChartCard>
    </div>
  );
}

