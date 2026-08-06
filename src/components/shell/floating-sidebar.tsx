import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Building2,
  Blocks,
  Users2,
  CalendarDays,
  MessageSquareHeart,
  Wand2,
  BarChart3,
  Workflow,
  MessageCircle,
  Bell,
  Settings,
  LogOut,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Item = { title: string; url: string; icon: typeof LayoutDashboard };

const platformItems: Item[] = [
  { title: "Dashboard", url: "/app/dashboard", icon: LayoutDashboard },
  { title: "Workspaces", url: "/app/workspaces", icon: Building2 },
  { title: "Modules", url: "/app/modules", icon: Blocks },
];

const operationsItems: Item[] = [
  { title: "QueueAI", url: "/app/queueai", icon: Users2 },
  { title: "EventAI", url: "/app/eventai", icon: CalendarDays },
  { title: "FeedbackAI", url: "/app/feedbackai", icon: MessageSquareHeart },
];

const intelligenceItems: Item[] = [
  { title: "AI Copilot", url: "/app/copilot", icon: Wand2 },
  { title: "Analytics", url: "/app/analytics", icon: BarChart3 },
  { title: "Automation", url: "/app/automation", icon: Workflow },
  { title: "WhatsApp", url: "/app/whatsapp", icon: MessageCircle },
];

export function FloatingSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const { signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    if (onNavigate) onNavigate();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <aside className="fixed inset-y-4 left-4 z-40 hidden w-[248px] lg:block">
      <div className="glass-strong shadow-float flex h-full flex-col overflow-hidden rounded-3xl">
        {/* Brand */}
        <Link to="/app/dashboard" className="flex items-center gap-2.5 px-5 pt-5 pb-4">
          <div className="grid size-8 place-items-center rounded-xl bg-white text-black">
            <Sparkles className="size-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-[15px] font-semibold tracking-tight text-white">
              EngageAI
            </span>
            <span className="text-[10px] uppercase tracking-[0.16em] text-white/40">Business OS</span>
          </div>
        </Link>

        <nav className="scrollbar-none flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          <Group items={platformItems} pathname={pathname} onNavigate={onNavigate} />
          <Section label="Operations">
            <Group items={operationsItems} pathname={pathname} onNavigate={onNavigate} />
          </Section>
          <Section label="Intelligence">
            <Group items={intelligenceItems} pathname={pathname} onNavigate={onNavigate} />
          </Section>
          <Section label="Workspace">
            <Group
              items={[
                { title: "Notifications", url: "/app/notifications", icon: Bell },
                { title: "Settings", url: "/app/settings", icon: Settings },
              ]}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          </Section>
        </nav>

        <div className="border-t border-white/[0.06] p-3">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-3 pb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/35">
        {label}
      </div>
      {children}
    </div>
  );
}

function Group({ items, pathname, onNavigate }: { items: Item[]; pathname: string; onNavigate?: () => void }) {
  return (
    <div className="space-y-0.5">
      {items.map((it) => (
        <NavLink key={it.url} item={it} pathname={pathname} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

function NavLink({ item, pathname, onNavigate }: { item: Item; pathname: string; onNavigate?: () => void }) {
  const active = pathname === item.url;
  const Icon = item.icon;
  return (
    <Link
      to={item.url as never}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
        active ? "text-white font-medium" : "text-white/60 hover:text-white",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-xl bg-white/[0.08] ring-1 ring-inset ring-white/10"
          transition={{ type: "spring", stiffness: 400, damping: 34 }}
        />
      )}
      <Icon className={cn("relative z-10 size-4 transition-colors", active ? "text-white" : "text-white/50 group-hover:text-white/80")} />
      <span className="relative z-10 truncate">{item.title}</span>
    </Link>
  );
}
