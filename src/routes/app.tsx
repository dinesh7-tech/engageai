import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Blocks,
  Building2,
  CalendarDays,
  LayoutDashboard,
  MessageSquareHeart,
  Menu,
  Search,
  Settings,
  Users2,
  Wand2,
  Workflow,
  MessageCircle,
  Loader2,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/app/Logo";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { useRealtimeNotifications } from "@/hooks/useRealtimeFeed";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});


const nav = [
  { section: "Platform", items: [
    { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/workspaces", label: "Workspaces", icon: Building2 },
    { to: "/app/modules", label: "Modules", icon: Blocks },
  ]},
  { section: "Operations", items: [
    { to: "/app/queueai", label: "Queue Line", icon: Users2 },
    { to: "/app/eventai", label: "Event Registry", icon: CalendarDays },
    { to: "/app/feedbackai", label: "Customer Reviews", icon: MessageSquareHeart },
  ]},
  { section: "Intelligence", items: [
    { to: "/app/copilot", label: "AI Copilot", icon: Wand2 },
    { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/app/automation", label: "Automation", icon: Workflow },
    { to: "/app/whatsapp", label: "WhatsApp", icon: MessageCircle },
  ]},
  { section: "Workspace", items: [
    { to: "/app/notifications", label: "Notifications", icon: Bell },
    { to: "/app/settings", label: "Settings", icon: Settings },
  ]},
] as const;

function NavList({ onNavigate, unread }: { onNavigate?: (() => void) | undefined; unread: number }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {nav.map((group) => (
        <div key={group.section}>
          <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {group.section}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.to;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                    )}
                  >
                    <item.icon className={cn("size-4", active && "text-primary")} />
                    {item.label}
                    {item.to === "/app/notifications" && unread > 0 && (
                      <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        {unread}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

function SidebarInner({ onNavigate, unread }: { onNavigate?: (() => void) | undefined; unread: number }) {
  const { activeWorkspace } = useActiveWorkspace();
  const { profile, initials, user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    if (onNavigate) onNavigate();
    navigate({ to: "/auth" });
  };

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Link to="/">
          <Logo />
        </Link>
      </div>
      <NavList onNavigate={onNavigate} unread={unread} />
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar className="size-8">
            <AvatarFallback className="bg-accent text-xs text-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{profile?.full_name || user?.email || "User"}</p>
            <p className="truncate text-xs text-muted-foreground">{activeWorkspace?.name || "No Workspace"}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full gap-2 text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="size-3.5" /> Sign Out
        </Button>
      </div>
    </div>
  );
}

function AppLayout() {
  const [open, setOpen] = useState(false);
  const { unreadCount: unread } = useRealtimeNotifications();
  const { user, loading } = useAuth();
  const { activeWorkspace, loading: wsLoading } = useActiveWorkspace();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
      return;
    }
    // Router State Machine: If authenticated but workspace is missing, force onboarding redirect
    if (!loading && user && !wsLoading && !activeWorkspace) {
      navigate({ to: "/onboarding" });
    }
  }, [user, loading, activeWorkspace, wsLoading, navigate]);

  if (loading || wsLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // Fallback to avoid crashes if workspace is not loaded yet
  if (!activeWorkspace) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <h2 className="text-lg font-semibold">Initializing Workspace...</h2>
        <p className="text-xs text-muted-foreground mt-1">If setup was interrupted, click below to resume setup.</p>
        <Button className="mt-4" onClick={() => navigate({ to: "/onboarding" })}>
          Continue Setup
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background relative">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border lg:block">
        <SidebarInner unread={unread} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border glass px-4 sm:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarInner onNavigate={() => setOpen(false)} unread={unread} />
            </SheetContent>
          </Sheet>

          <div className="relative hidden max-w-md flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search modules, customers, events…" className="h-9 pl-9" />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Link to="/app/notifications">
              <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                <Bell className="size-4" />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />
                )}
              </Button>
            </Link>
            <Link to="/app/copilot">
              <Button size="sm" className="ml-1 gap-2">
                <Activity className="size-4" /> Ask EngageAI
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="ml-1 gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={async () => {
                const { supabase } = await import("@/integrations/supabase/client");
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
              title="Sign Out"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1400px] space-y-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Developer Diagnostics Overlay */}
      {process.env.NODE_ENV !== "production" && (
        <div className="fixed bottom-4 right-4 z-50 p-4 rounded-xl border border-primary/20 bg-card/90 shadow-2xl backdrop-blur-md max-w-xs text-[10px] space-y-2 pointer-events-auto">
          <div className="flex items-center justify-between border-b border-border pb-1">
            <span className="font-bold text-primary">BUSINESS OS DIAGNOSTICS</span>
            <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <div>
            <span className="text-muted-foreground">Session Status:</span> <span className="font-semibold text-emerald-400">AUTHENTICATED</span>
          </div>
          <div>
            <span className="text-muted-foreground">Active User:</span> <span className="font-mono text-muted-foreground select-all">{user.id}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Workspace Name:</span> <span className="font-semibold">{activeWorkspace?.name || "None"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Provisioning State:</span> <span className="font-semibold text-blue-400">READY</span>
          </div>
        </div>
      )}
    </div>
  );
}
