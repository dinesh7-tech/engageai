import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { FloatingSidebar } from "@/components/shell/floating-sidebar";
import { TopNav } from "@/components/shell/top-nav";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useRealtimeNotifications } from "@/hooks/useRealtimeFeed";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { unreadCount: unread } = useRealtimeNotifications();
  const { user, loading } = useAuth();
  const { activeWorkspace, loading: wsLoading } = useActiveWorkspace();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!loading && user && !user.email_confirmed_at) {
      navigate({ to: "/verify-email" });
      return;
    }
    if (!loading && user && !wsLoading && !activeWorkspace) {
      navigate({ to: "/onboarding" });
    }
  }, [user, loading, activeWorkspace, wsLoading, navigate]);

  if (loading || wsLoading || !user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-white/50" />
      </div>
    );
  }

  if (!activeWorkspace) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <h2 className="text-lg font-semibold text-white">Initializing Workspace...</h2>
        <p className="text-xs text-white/50 mt-1">If setup was interrupted, click below to resume setup.</p>
        <Button className="mt-4 rounded-full bg-white text-black hover:bg-white/90" onClick={() => navigate({ to: "/onboarding" })}>
          Continue Setup
        </Button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-background">
      {/* Ambient gradient wash */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-60">
        <div className="aurora absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-white/[0.04] blur-[120px]" />
        <div className="aurora absolute top-1/3 right-[-10%] h-[520px] w-[520px] rounded-full bg-white/[0.03] blur-[120px]" style={{ animationDelay: "-4s" }} />
      </div>

      <FloatingSidebar />
      <TopNav onOpenMobile={() => setMobileOpen(true)} unread={unread} />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-r border-white/10 bg-background p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="h-full">
            <FloatingSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <main className="pb-16 pt-6 lg:pl-[264px]">
        <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

