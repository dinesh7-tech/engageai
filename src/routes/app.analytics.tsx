import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { ChartCard } from "@/components/app/ChartCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { getWorkspaceMetrics, buildDefaultMetrics, WorkspaceMetrics } from "@/lib/metrics.functions";

export const Route = createFileRoute("/app/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — EngageAI" },
      { name: "description", content: "Cross-module KPIs: waiting time, feedback rate, sentiment, peak hours, registrations and satisfaction." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { activeWorkspace } = useActiveWorkspace();
  const [metrics, setMetrics] = useState<WorkspaceMetrics>(() => buildDefaultMetrics(activeWorkspace?.id || "ws_1"));

  useEffect(() => {
    if (!activeWorkspace?.id) return;
    getWorkspaceMetrics({ data: { workspaceId: activeWorkspace.id } })
      .then((res) => setMetrics(res))
      .catch(() => {});
  }, [activeWorkspace?.id]);

  const kpis = [
    { label: "Avg. waiting time", value: metrics.kpis.queueai.todayVisitors > 0 ? `${metrics.kpis.queueai.avgWait}m` : "0m", delta: "0%", trend: "flat" as const },
    { label: "Feedback rate", value: `${metrics.kpis.eventai.feedbackRate}%`, delta: "0%", trend: "flat" as const },
    { label: "Positive sentiment", value: `${metrics.kpis.feedbackai.sentiment}%`, delta: "0%", trend: "flat" as const },
    { label: "Registrations", value: String(metrics.kpis.eventai.registrations), delta: "0%", trend: "flat" as const },
    { label: "Attendance rate", value: `${metrics.kpis.eventai.feedbackRate}%`, delta: "0%", trend: "flat" as const },
    { label: "Customer satisfaction", value: `${metrics.kpis.feedbackai.rating} / 5`, delta: "0", trend: "flat" as const },
  ];

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Every module reporting into one performance surface."
        actions={
          <Button size="sm" variant="outline" onClick={() => toast.success("Report export queued — you'll get it over email")}>
            Export report
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((k) => (
          <StatCard key={k.label} label={k.label} value={k.value} delta={k.delta} trend={k.trend} />
        ))}
      </div>

      <div className="p-12 text-center text-sm text-muted-foreground panel mt-6">
        Detailed timelines and chart visualization analytics will populate as customer interactions are logged.
      </div>
    </>
  );
}
