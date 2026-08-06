import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
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
  const userName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "User";

  useEffect(() => {
    if (!activeWorkspace?.id) return;
    setMetricsLoading(true);
    getWorkspaceMetrics({ data: { workspaceId: activeWorkspace?.id } })
      .then((res) => setMetrics(res))
      .catch(() => {})
      .finally(() => setMetricsLoading(false));
  }, [activeWorkspace?.id]);

  return (
    <>
      <PageHeader
        title={`Good morning, ${userName}`}
        description={`Here's what's happening across ${businessName} today.`}
        actions={
          <>
            <Link to="/app/analytics">
              <Button variant="outline" size="sm">View analytics</Button>
            </Link>
            <Link to="/app/copilot">
              <Button size="sm" className="gap-2">
                <Sparkles className="size-4" /> Ask EngageAI
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Active modules", value: "3", delta: "0", hint: "active", icon: Blocks },
          { label: "Customers served today", value: String(metrics.kpis.queueai.todayVisitors), delta: "0", hint: "visitors today", icon: Users2 },
          { label: "Unread notifications", value: String(unreadCount), hint: "live from your modules", icon: Bell },
          { label: "Workspace health", value: `${metrics.businessScore}%`, delta: "0", hint: "system health", icon: Gauge },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35 }}
          >
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Platform Overview"
          subtitle="Real-time live queue volume and active processes"
        >
          <div className="p-8 text-center text-sm text-muted-foreground">
            No active timeline charts. Charts will populate as daily queue check-ins register.
          </div>
        </ChartCard>

        <div className="space-y-6">
          <ChartCard title="Quick actions" subtitle="Jump straight into a workflow">
            <div className="grid gap-2">
              {quickActions.map((a) => (
                <Link
                  key={a.label}
                  to={a.to}
                  className="flex items-center gap-3 rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm transition-colors hover:border-primary/40 hover:bg-secondary"
                >
                  <a.icon className="size-4 text-primary" />
                  {a.label}
                  <ArrowRight className="ml-auto size-4 text-muted-foreground" />
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
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-muted-foreground">{m.usage > 0 ? "Active" : "Inactive"}</span>
                  </div>
                  <Progress value={m.usage} className="h-1.5" />
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
              <div key={i} className="h-10 animate-pulse rounded-lg bg-secondary/60" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No activity logged in this workspace yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {events.map((a) => (
              <li key={a.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <Badge variant="secondary" className="shrink-0">{a.actor}</Badge>
                <p className="min-w-0 flex-1 truncate text-sm">{a.text}</p>
                <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </ChartCard>
    </>
  );
}
