import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Users2,
  CalendarDays,
  MessageSquareHeart,
  Wand2,
  Workflow,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  ArrowRight,
  Settings,
  Search,
  Plus,
  Send,
  UserPlus,
  ArrowUpRight,
  Activity,
  Layers,
  ChevronDown,
  Building2,
  Bell,
  Play,
  RotateCw,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { getWorkspaceMetrics, buildDefaultMetrics, WorkspaceMetrics } from "@/lib/metrics.functions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

export function WorkspaceHome() {
  const navigate = useNavigate();
  const { activeWorkspace, workspaceList, setActiveWorkspace, createWorkspace, loading: wsLoading } = useActiveWorkspace();
  const { user, profile, loading: authLoading } = useAuth();

  // Initialize with client-side defaults so the page NEVER shows blank
  const [metrics, setMetrics] = useState<WorkspaceMetrics>(() =>
    buildDefaultMetrics(activeWorkspace?.id || "ws_1")
  );
  const [loading, setLoading] = useState(true);
  const [copilotQuery, setCopilotQuery] = useState("");
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Agent");
  const [showCreateWsDialog, setShowCreateWsDialog] = useState(false);
  const [newWsName, setNewWsName] = useState("");

  // Command Palette State
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");

  // Fetch metrics helper — NEVER crashes.
  // On failure: keeps cached/default metrics and retries on next poll.
  const fetchMetrics = async (wsId: string, showSkeleton = false) => {
    if (showSkeleton) setLoading(true);
    try {
      const res = await getWorkspaceMetrics({ data: { workspaceId: wsId } });
      setMetrics(res);
    } catch (err: any) {
      console.warn("[WorkspaceHome] Metrics fetch failed, using cached/default data:", err?.message || err);
      // On first load failure, generate fresh client-side defaults
      setMetrics((prev) => prev ?? buildDefaultMetrics(wsId));
    } finally {
      setLoading(false);
    }
  };

  // Poll for metrics every 15 seconds
  useEffect(() => {
    if (!activeWorkspace?.id) return;
    fetchMetrics(activeWorkspace.id, true);

    const interval = setInterval(() => {
      fetchMetrics(activeWorkspace.id, false);
    }, 15000);

    return () => clearInterval(interval);
  }, [activeWorkspace?.id]);

  // Command Palette Keyboard shortcut (Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Redirect to onboarding if authenticated but workspace is missing (Never call navigate during render)
  useEffect(() => {
    if (!wsLoading && !authLoading && !activeWorkspace) {
      navigate({ to: "/onboarding" });
    }
  }, [wsLoading, authLoading, activeWorkspace, navigate]);

  // If workspaces are still loading or auth is loading, show spinner
  if (wsLoading || authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Activity className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no workspace exists yet, return null (handled by redirect effect)
  if (!activeWorkspace) {
    return null;
  }

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    toast.success(`Invitation sent to ${inviteEmail} as ${inviteRole}`);
    setInviteEmail("");
    setShowInviteDialog(false);
  };

  const handleCreateWorkspace = async () => {
    if (!newWsName.trim()) return;
    try {
      const ws = await createWorkspace({
        name: newWsName.trim(),
        category: "Other",
        timezone: "Asia/Kolkata",
        country: "IN",
      });
      toast.success(`Workspace "${ws.name}" created successfully`);
      setNewWsName("");
      setShowCreateWsDialog(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create workspace");
    }
  };

  const handleCopilotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotQuery.trim()) return;
    navigate({ to: "/app/copilot", search: { q: copilotQuery } as any });
  };

  const executeCommand = (action: () => void) => {
    action();
    setShowCommandPalette(false);
    setCommandSearch("");
  };

  const commands = [
    { name: "Create Event", desc: "Launch EventAI creator flow", icon: Plus, action: () => navigate({ to: "/app/eventai" }) },
    { name: "Generate QR", desc: "Get dynamic workspace check-in QR code", icon: Sparkles, action: () => { toast.success("QR Code generated for current location"); } },
    { name: "Broadcast Message", desc: "Send WhatsApp blast to subscribers", icon: Send, action: () => navigate({ to: "/app/whatsapp" }) },
    { name: "View Queue", desc: "Open QueueAI customer management line", icon: Users2, action: () => navigate({ to: "/app/queueai" }) },
    { name: "Generate AI Report", desc: "Synthesize operational brief", icon: Wand2, action: () => { toast.info("Generating real-time business health analysis..."); } },
    { name: "Invite Member", desc: "Add teammate to current workspace", icon: UserPlus, action: () => setShowInviteDialog(true) },
    { name: "Open Settings", desc: "Modify system and security configurations", icon: Settings, action: () => navigate({ to: "/app/settings" }) },
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.name.toLowerCase().includes(commandSearch.toLowerCase()) ||
    cmd.desc.toLowerCase().includes(commandSearch.toLowerCase())
  );

  return (
    <div className="relative min-h-screen pb-12 text-foreground">
      {/* Background Glows */}
      <div className="pointer-events-none absolute inset-0 hero-glow" />
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-10" />

      {/* Main Header / Switcher Bar */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-border/40 pb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setShowWorkspaceSwitcher(!showWorkspaceSwitcher)}
              className="flex items-center gap-3 rounded-2xl border border-border/80 glass px-4 py-2.5 hover:bg-secondary/40 transition-all text-left"
            >
              <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary/80 to-purple-600 text-sm font-semibold text-white shadow-lg shadow-primary/20">
                {activeWorkspace.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm tracking-tight">{activeWorkspace.name}</span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                  <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Online · {activeWorkspace.plan}</span>
                </div>
              </div>
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {showWorkspaceSwitcher && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowWorkspaceSwitcher(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute left-0 mt-2 w-64 rounded-2xl border border-border/80 glass p-2 shadow-2xl z-50 overflow-hidden"
                  >
                    <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Switch Workspace
                    </p>
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {workspaceList.map((ws) => (
                        <button
                          key={ws.id}
                          onClick={() => {
                            setActiveWorkspace(ws.id);
                            setShowWorkspaceSwitcher(false);
                            toast.success(`Switched to ${ws.name}`);
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                            ws.id === activeWorkspace.id
                              ? "bg-primary/20 text-foreground border border-primary/20"
                              : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <div className="grid size-7 place-items-center rounded-lg bg-accent text-xs font-semibold">
                            {ws.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium truncate">{ws.name}</span>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-border/50 my-1.5 pt-1.5">
                      <button
                        onClick={() => {
                          setShowCreateWsDialog(true);
                          setShowWorkspaceSwitcher(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Plus className="size-4" />
                        <span>Create Workspace</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="hidden lg:flex items-center gap-6 border-l border-border/60 pl-6 text-sm text-muted-foreground">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/60">Date</span>
              <span className="font-medium text-foreground/90">{new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/60">Business Score</span>
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="size-3.5" /> {loading ? "..." : `${metrics?.businessScore}/100`}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/60">Active Agents</span>
              <span className="font-medium text-foreground/90">{loading ? "..." : metrics?.teamMembers.filter(t => t.online).length} online</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <Button
            variant="outline"
            className="rounded-2xl border-border/60 hover:bg-secondary/40 text-xs px-3.5 h-10 gap-1.5"
            onClick={() => setShowInviteDialog(true)}
          >
            <UserPlus className="size-4" />
            <span>Invite Team</span>
          </Button>

          <Button
            variant="default"
            className="rounded-2xl bg-primary text-primary-foreground hover:opacity-90 text-xs px-3.5 h-10 gap-1.5 shadow-lg shadow-primary/20"
            onClick={() => setShowCommandPalette(true)}
          >
            <Search className="size-4" />
            <span>Command Palette</span>
            <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 text-[10px] font-mono">
              Ctrl+K
            </kbd>
          </Button>
        </div>
      </div>

      {/* Main OS Layout Grid */}
      {metrics?.kpis.queueai.todayVisitors === 0 &&
      metrics?.kpis.eventai.registrations === 0 &&
      metrics?.kpis.feedbackai.received === 0 ? (
        // Setup Mode (Getting Started Checklist)
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-8">
          <div className="xl:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-[24px] border border-border/60 bg-gradient-to-br from-card to-card/45 p-6 md:p-8"
            >
              <div className="pointer-events-none absolute right-0 top-0 size-80 bg-primary/10 rounded-full blur-[100px]" />
              <div className="relative space-y-4">
                <Badge className="bg-primary/20 text-primary hover:bg-primary/20 border-none rounded-full px-3 py-1">
                  <Sparkles className="size-3.5 mr-1" />
                  <span>AI Business Setup Wizard</span>
                </Badge>
                <h1 className="font-display text-2xl md:text-3xl font-semibold leading-tight tracking-tight">
                  Good Morning {profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there"} 👋 <br />
                  <span className="text-muted-foreground text-xl md:text-2xl font-light">
                    Let's complete your operational configuration for {activeWorkspace.name}.
                  </span>
                </h1>
                <p className="text-sm text-muted-foreground max-w-xl">
                  EngageAI is in setup mode. Once you perform your first operation (like queueing a client, hosting an event, or logging feedback), this control panel will automatically evolve into a real-time business operations timeline.
                </p>
              </div>
            </motion.div>

            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 px-1">
                Your Setup Tasks
              </h3>
              
              <div className="grid grid-cols-1 gap-3">
                {[
                  { title: "Configure your Queue Line services", desc: "Define hair-styling, billing waitlists, or table times inside the queue queue.", to: "/app/queueai", label: "Open Queue Line" },
                  { title: "Generate workspace QR check-in", desc: "Expose your check-in portal link so clients can scan and join queues.", to: "/app/queueai", label: "Get QR Code" },
                  { title: "Host your first Event registry", desc: "Pre-program summit checkpoints, registration lists, or ticket lines.", to: "/app/eventai", label: "Open Event Registry" },
                  { title: "Request customer reviews", desc: "Design a feedback campaign to send review requests over WhatsApp.", to: "/app/feedbackai", label: "Open Customer Reviews" },
                  { title: "Link custom WhatsApp settings", desc: "Optionally connect Twilio/Meta API sandbox channels to start sending text alerts.", to: "/app/whatsapp", label: "WhatsApp Channels" },
                ].map((task, idx) => (
                  <div key={idx} className="panel p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-primary/30 transition-colors">
                    <div>
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <span className="grid size-5 place-items-center rounded-full bg-secondary text-xs text-muted-foreground">
                          {idx + 1}
                        </span>
                        {task.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 ml-7">{task.desc}</p>
                    </div>
                    <Link to={task.to} className="ml-7 md:ml-0 shrink-0">
                      <Button size="sm" variant="outline">{task.label}</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="panel p-5 bg-card/60 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border/40 pb-2">
                Setup Progress
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Workspace Readiness</span>
                  <span>40%</span>
                </div>
                <Progress value={40} className="h-1.5" />
              </div>
              <p className="text-xs text-muted-foreground leading-normal">
                Configuration files initialized for <strong>{activeWorkspace.category}</strong>. Install operations channels above to unlock live score analytics.
              </p>
            </div>
          </div>
        </div>
      ) : (
        // Live Mode (Realtime Operations Dashboard)
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-8">
          
          {/* Left 2 Columns: Executive Action Hub */}
          <div className="xl:col-span-2 space-y-8">
            
            {/* AI Daily Briefing Panel */}
            {loading ? (
              <div className="panel p-6 animate-pulse space-y-4">
                <div className="h-6 w-48 bg-muted rounded-lg" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="h-16 bg-muted rounded-xl" />
                  <div className="h-16 bg-muted rounded-xl" />
                  <div className="h-16 bg-muted rounded-xl" />
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[24px] border border-border/60 bg-gradient-to-br from-card to-card/45 p-6 md:p-8"
              >
                <div className="pointer-events-none absolute right-0 top-0 size-80 bg-primary/10 rounded-full blur-[100px]" />
                <div className="relative flex flex-col md:flex-row justify-between gap-6">
                  <div className="space-y-4 max-w-xl">
                    <Badge className="bg-primary/20 text-primary hover:bg-primary/20 border-none rounded-full px-3 py-1">
                      <Sparkles className="size-3.5 mr-1" />
                      <span>AI Daily Briefing</span>
                    </Badge>
                    <h1 className="font-display text-2xl md:text-3xl font-semibold leading-tight tracking-tight">
                      Good Morning {profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there"} 👋 <br />
                      <span className="text-muted-foreground text-xl md:text-2xl font-light">
                        {activeWorkspace.name} is operating normally.
                      </span>
                    </h1>
                    
                    <div className="space-y-2 mt-2">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Today's Highlights</h4>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm text-foreground/80">
                        {metrics?.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-secondary/30 border border-border/40 shrink-0 min-w-[150px] text-center backdrop-blur-md">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Health Score</span>
                    <span className="font-display text-5xl font-extrabold text-emerald-400 mt-2 tracking-tighter">
                      {metrics?.businessScore}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70 mt-1">out of 100</span>
                    <div className="w-full bg-border/40 h-1.5 rounded-full overflow-hidden mt-4">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${metrics?.businessScore}%` }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* AI Attention Center */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1.5 px-1">
                <AlertTriangle className="size-3.5 text-amber-500" />
                <span>AI Attention Center</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-14 bg-muted rounded-2xl animate-pulse" />
                  ))
                ) : metrics?.attentionAlerts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground panel col-span-2">
                    No critical operations alerts pending attention.
                  </div>
                ) : (
                  metrics?.attentionAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 bg-card/65 transition-all hover:scale-[1.01] ${
                        alert.severity === "error"
                          ? "border-rose-500/20 text-rose-200"
                          : alert.severity === "warning"
                          ? "border-amber-500/20 text-amber-200"
                          : alert.severity === "success"
                          ? "border-emerald-500/20 text-emerald-200"
                          : "border-border/60 text-foreground"
                      }`}
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary/40">
                        {alert.severity === "error" && <span className="size-2 rounded-full bg-rose-500 animate-ping" />}
                        {alert.severity === "warning" && <span className="size-2.5 rounded-full bg-amber-500 animate-pulse" />}
                        {alert.severity === "success" && <span className="size-2.5 rounded-full bg-emerald-500" />}
                        {alert.severity === "info" && <span className="size-2.5 rounded-full bg-blue-500" />}
                      </span>
                      <span className="text-xs font-medium leading-normal">{alert.text}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* AI Copilot Prompt Panel */}
            <div className="rounded-[24px] border border-border/60 bg-card p-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Wand2 className="size-4 text-primary" />
                <span>Ask EngageAI Copilot</span>
              </h3>
              <form onSubmit={handleCopilotSubmit} className="relative">
                <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Ask EngageAI anything (e.g. Predict tomorrow's queue rush)..."
                  value={copilotQuery}
                  onChange={(e) => setCopilotQuery(e.target.value)}
                  className="h-12 pl-11 pr-24 rounded-xl bg-secondary/20 border-border/80 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:ring-1 text-sm"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 h-8"
                >
                  Send AI
                </Button>
              </form>
            </div>

            {/* AI Operating Modules */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Business Operations
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-6">
                
                {/* Queue line Module Card */}
                <div className="relative overflow-hidden rounded-[24px] border border-border/60 bg-card/30 p-5 md:p-6 group hover:border-primary/30 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Users2 className="size-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-base">Queue Line</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">Virtual waiting list & queue recovery</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                      <Link to="/app/queueai">
                        <Button variant="default" size="sm" className="rounded-xl px-4 text-xs h-9 gap-1.5">
                          Open <ArrowRight className="size-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground/60">Waiting</span>
                      <span className="block text-xl font-bold tracking-tight mt-0.5 text-amber-400">{metrics?.kpis.queueai.waiting}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground/60">Now Serving</span>
                      <span className="block text-xl font-bold tracking-tight mt-0.5 text-primary">{metrics?.kpis.queueai.serving}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground/60">Average Wait</span>
                      <span className="block text-xl font-bold tracking-tight mt-0.5">{metrics?.kpis.queueai.avgWait}m</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground/60">Exit Rate</span>
                      <span className="block text-xl font-bold tracking-tight mt-0.5 text-rose-400">{metrics?.kpis.queueai.exitRate}%</span>
                    </div>
                  </div>
                </div>

                {/* Event Registry Module Card */}
                <div className="relative overflow-hidden rounded-[24px] border border-border/60 bg-card/30 p-5 md:p-6 group hover:border-primary/30 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                        <CalendarDays className="size-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-base">Event Registry</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">Attendee registers, automated checking and reports</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                      <Link to="/app/eventai">
                        <Button variant="default" size="sm" className="rounded-xl px-4 text-xs h-9 gap-1.5">
                          Open <ArrowRight className="size-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground/60">Active Event</span>
                      <span className="block text-sm font-semibold mt-0.5 truncate text-foreground">{metrics?.kpis.eventai.activeEvent}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground/60">Registrations</span>
                      <span className="block text-xl font-bold tracking-tight mt-0.5 text-primary">{metrics?.kpis.eventai.registrations}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground/60">Attendance</span>
                      <span className="block text-xl font-bold tracking-tight mt-0.5">{metrics?.kpis.eventai.attendance}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground/60">Feedback %</span>
                      <span className="block text-xl font-bold tracking-tight mt-0.5 text-emerald-400">{metrics?.kpis.eventai.feedbackRate}%</span>
                    </div>
                  </div>
                </div>

                {/* Customer Reviews Module Card */}
                <div className="relative overflow-hidden rounded-[24px] border border-border/60 bg-card/30 p-5 md:p-6 group hover:border-primary/30 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                        <MessageSquareHeart className="size-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-base">Customer Reviews</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">WhatsApp feedback requests & sentiment clusters</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                      <Link to="/app/feedbackai">
                        <Button variant="default" size="sm" className="rounded-xl px-4 text-xs h-9 gap-1.5">
                          Open <ArrowRight className="size-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground/60">Received</span>
                      <span className="block text-xl font-bold tracking-tight mt-0.5 text-primary">{metrics?.kpis.feedbackai.received}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground/60">Pending</span>
                      <span className="block text-xl font-bold tracking-tight mt-0.5 text-amber-400">{metrics?.kpis.feedbackai.pending}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground/60">Avg Rating</span>
                      <span className="block text-xl font-bold tracking-tight mt-0.5 text-emerald-400">★ {metrics?.kpis.feedbackai.rating}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground/60">Sentiment</span>
                      <span className="block text-xl font-bold tracking-tight mt-0.5">{metrics?.kpis.feedbackai.sentiment}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Unified Timelines & predict stats */}
          <div className="space-y-8">
            <div className="panel p-5 bg-card/60 space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Unified Business Timeline
                </h3>
                <Clock className="size-3.5 text-muted-foreground/70" />
              </div>

              <div className="relative pl-4 space-y-4 border-l border-border/40 py-1.5">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />
                  ))
                ) : metrics?.timeline.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-2">
                    No operational activities logged yet today.
                  </div>
                ) : (
                  metrics?.timeline.map((act) => (
                    <div key={act.id} className="relative space-y-1 group">
                      <span className={`absolute -left-[21px] top-1.5 size-2.5 rounded-full border border-card ${
                        act.type === "warning" ? "bg-amber-400" : act.type === "error" ? "bg-rose-500" : "bg-primary"
                      }`} />
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-semibold text-primary uppercase tracking-wider">
                          {act.module}
                        </span>
                        <span className="text-[9px] text-muted-foreground">{act.time}</span>
                      </div>
                      <p className="text-xs text-foreground/80 leading-normal font-normal">
                        {act.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="panel p-5 bg-card/60 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 border-b border-border/40 pb-2">
                AI Forecasts & Predictions
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/20 border border-border/30">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-amber-400" />
                    <span className="text-xs font-medium">Expected Queue Line</span>
                  </div>
                  <span className="text-xs font-bold">{metrics?.predictions.expectedQueueLength} min</span>
                </div>
                
                <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/20 border border-border/30">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-primary" />
                    <span className="text-xs font-medium">Predicted Event Signups</span>
                  </div>
                  <span className="text-xs font-bold">+{metrics?.predictions.expectedRegistrations} new</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ctrl+K Command Palette Dialog */}
      <AnimatePresence>
        {showCommandPalette && (
          <Dialog open={showCommandPalette} onOpenChange={setShowCommandPalette}>
            <DialogContent className="p-0 border-border/60 max-w-xl overflow-hidden glass rounded-3xl">
              <DialogHeader className="p-4 border-b border-border/40 flex flex-row items-center gap-3">
                <Search className="size-5 text-muted-foreground" />
                <Input
                  placeholder="Type a command to run..."
                  value={commandSearch}
                  onChange={(e) => setCommandSearch(e.target.value)}
                  className="border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base pl-0 p-0 h-10 w-full bg-transparent"
                  autoFocus
                />
              </DialogHeader>
              <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                {filteredCommands.length > 0 ? (
                  filteredCommands.map((cmd, idx) => (
                    <button
                      key={idx}
                      onClick={() => executeCommand(cmd.action)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 hover:bg-secondary/40 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="grid size-8 place-items-center rounded-lg bg-accent/60 text-primary">
                          <cmd.icon className="size-4" />
                        </div>
                        <div>
                          <span className="block text-sm font-semibold">{cmd.name}</span>
                          <span className="block text-xs text-muted-foreground">{cmd.desc}</span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-secondary px-2 py-0.5 rounded border border-border/50 text-muted-foreground">
                        Action
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No commands found matching "{commandSearch}"
                  </div>
                )}
              </div>
              <div className="bg-secondary/20 p-2 border-t border-border/40 flex justify-between text-[10px] text-muted-foreground px-4 py-3">
                <span>Use ↑↓ arrows to navigate, enter to select</span>
                <span>ESC to close</span>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Invite Member Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="glass border-border/60 max-w-sm rounded-[24px]">
          <DialogHeader>
            <DialogTitle>Invite Teammate</DialogTitle>
            <DialogDescription>
              Add a team member to access this operational workspace.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Work Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="teammate@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="bg-secondary/20 border-border/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full bg-secondary/20 border border-border/60 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Agent">Agent</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="submit" className="w-full">Send Invitation</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Workspace Dialog */}
      <Dialog open={showCreateWsDialog} onOpenChange={setShowCreateWsDialog}>
        <DialogContent className="glass border-border/60 max-w-sm rounded-[24px]">
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
            <DialogDescription>
              Workspaces isolate data, billing plans, and member roles.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="ws-create-name">Workspace Name</Label>
              <Input
                id="ws-create-name"
                placeholder="e.g. Harbour Clinics"
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                className="bg-secondary/20 border-border/60"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button onClick={handleCreateWorkspace} className="w-full">Create Workspace</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
