import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRealtimeNotifications, relativeTime } from "@/hooks/useRealtimeFeed";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/app/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — EngageAI" },
      { name: "description", content: "Realtime workspace notifications and activity feed across all EngageAI modules." },
      { property: "og:title", content: "Notifications — EngageAI" },
      { property: "og:description", content: "Realtime workspace notifications across all EngageAI modules." },
    ],
  }),
  component: NotificationsPage,
});

const icons = {
  warning: AlertTriangle,
  success: CheckCircle2,
  destructive: AlertTriangle,
  info: Info,
} as const;

const tones = {
  warning: "bg-warning/15 text-warning",
  success: "bg-success/15 text-success",
  destructive: "bg-destructive/15 text-destructive",
  info: "bg-accent text-primary",
} as const;

function NotificationsPage() {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useRealtimeNotifications();
  const [onlyUnread, setOnlyUnread] = useState(false);
  const visible = onlyUnread ? notifications.filter((n) => n.unread) : notifications;

  return (
    <>
      <PageHeader
        title="Notifications"
        description={`${unreadCount} unread across queues, events, feedback and automations. Updates stream in live.`}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => setOnlyUnread((v) => !v)}>
              {onlyUnread ? "Show all" : "Unread only"}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                markAllRead();
                toast.success("All notifications marked as read");
              }}
            >
              Mark all read
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="panel h-24 animate-pulse p-5" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="You're all caught up"
          description="No unread notifications right now. New alerts from your modules will land here instantly."
          action={<Button onClick={() => setOnlyUnread(false)}>Show all notifications</Button>}
        />
      ) : (
        <div className="space-y-3">
          {visible.map((n) => {
            const Icon = icons[n.severity] ?? Info;
            return (
              <div
                key={n.id}
                className={cn("panel flex items-start gap-4 p-5", n.unread && "border-primary/30")}
              >
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", tones[n.severity] ?? tones.info)}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{n.title}</h3>
                    {n.unread && <Badge className="bg-primary/15 text-primary">New</Badge>}
                    <span className="ml-auto text-xs text-muted-foreground">{relativeTime(n.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                </div>
                {n.unread && (
                  <Button variant="ghost" size="sm" onClick={() => markRead(n.id)}>
                    Mark read
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

    </>
  );
}
