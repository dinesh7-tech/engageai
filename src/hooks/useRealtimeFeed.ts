import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Severity = "info" | "success" | "warning" | "destructive";

export type NotificationRow = {
  id: string;
  workspace_id: string;
  title: string;
  body: string;
  severity: Severity;
  created_at: string;
};

export type ActivityRow = {
  id: string;
  workspace_id: string;
  actor: string;
  text: string;
  created_at: string;
};

const READ_KEY = "engageai.read-notifications";

function loadRead(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRead(ids: string[]) {
  try {
    window.localStorage.setItem(READ_KEY, JSON.stringify(ids.slice(-500)));
  } catch {
    /* ignore quota errors */
  }
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

/** Live notifications for a workspace, with per-device read state. */
export function useRealtimeNotifications(workspaceId = "ws_1") {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setReadIds(loadRead());
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!cancelled) {
        setItems((data ?? []) as NotificationRow[]);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`notifications:${workspaceId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          setItems((prev) => [payload.new as NotificationRow, ...prev].slice(0, 50));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [workspaceId]);

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      saveRead(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setItems((current) => {
      setReadIds(() => {
        const next = Array.from(new Set(current.map((n) => n.id)));
        saveRead(next);
        return next;
      });
      return current;
    });
  }, []);

  const withRead = items.map((n) => ({ ...n, unread: !readIds.includes(n.id) }));

  return {
    notifications: withRead,
    unreadCount: withRead.filter((n) => n.unread).length,
    loading,
    markRead,
    markAllRead,
  };
}

/** Live activity feed for a workspace. */
export function useRealtimeActivity(workspaceId = "ws_1", limit = 12) {
  const [events, setEvents] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { data } = await supabase
        .from("activity_events")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (!cancelled) {
        setEvents((data ?? []) as ActivityRow[]);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`activity:${workspaceId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_events", filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          setEvents((prev) => [payload.new as ActivityRow, ...prev].slice(0, limit));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [workspaceId, limit]);

  return { events, loading };
}
