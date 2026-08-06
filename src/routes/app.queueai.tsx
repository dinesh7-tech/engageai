import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Clock, LogOut, QrCode, Sparkles, TrendingUp, Users2, Plus, Copy, Download, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { ChartCard } from "@/components/app/ChartCard";
import { CopilotPanel } from "@/components/app/CopilotPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { dispatchWhatsApp } from "@/lib/whatsapp-client";
import { emitActivity } from "@/lib/realtime.functions";
import { FadeUp, Stagger } from "@/components/motion/primitives";

export const Route = createFileRoute("/app/queueai")({
  head: () => ({
    meta: [
      { title: "QueueAI — Virtual Queue Management | EngageAI" },
      { name: "description", content: "Live queue positions, AI wait prediction, exit recovery and peak-hour forecasting." },
    ],
  }),
  component: QueueAIPage,
});

interface QueueItem {
  id: string;
  token: string;
  customer_name: string;
  customer_phone: string | null;
  service: string | null;
  status: string;
  waited: number;
  eta_minutes: number;
}

function QueueAIPage() {
  const { activeWorkspace } = useActiveWorkspace();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custService, setCustService] = useState("");

  const businessName = activeWorkspace?.name || "Our Business";
  const workspaceId = activeWorkspace?.id;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://engageai.vercel.app";
  const joinUrl = `${baseUrl}/join/${activeWorkspace?.slug || ""}`;

  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    toast.success("Check-in link copied to clipboard!");
  };

  const downloadPNG = () => {
    const svgEl = document.getElementById("qr-code-svg");
    if (!svgEl) return;
    const svgString = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const URLObj = window.URL || window.webkitURL || window;
    const blobURL = URLObj.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "#FFFFFF";
        context.fillRect(0, 0, 512, 512);
        context.drawImage(image, 0, 0, 512, 512);
        const png = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = png;
        downloadLink.download = `${activeWorkspace?.slug || "workspace"}-qr.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        toast.success("PNG downloaded!");
      }
    };
    image.src = blobURL;
  };

  const fetchQueue = async () => {
    if (!workspaceId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("queue_entries")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("joined_at", { ascending: true });

    if (error) {
      toast.error("Failed to load queue entries");
    } else {
      const now = Date.now();
      const mapped = (data || []).map((item) => {
        const joined = new Date(item.joined_at).getTime();
        const waited = Math.round((now - joined) / 60000);
        return {
          id: item.id,
          token: item.token,
          customer_name: item.customer_name,
          customer_phone: item.customer_phone,
          service: item.service,
          status: item.status,
          waited: item.status === "waiting" || item.status === "serving" ? Math.max(0, waited) : 0,
          eta_minutes: item.eta_minutes || 0,
        };
      });
      setQueue(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQueue();
    if (!workspaceId) return;
    const channel = supabase
      .channel("live_queue_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_entries", filter: `workspace_id=eq.${workspaceId}` },
        () => {
          fetchQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId]);

  async function handleAddQueue() {
    if (!custName.trim() || !workspaceId) return;
    const activeWaiting = queue.filter(q => q.status === "waiting" || q.status === "serving");
    const nextTokenNum = activeWaiting.length + 101;
    const token = `A-${nextTokenNum}`;

    const { error } = await supabase.from("queue_entries").insert({
      workspace_id: workspaceId,
      token,
      customer_name: custName.trim(),
      customer_phone: custPhone.trim() || null,
      service: custService.trim() || null,
      status: "waiting",
      eta_minutes: activeWaiting.length * 10,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${custName.trim()} added to the queue`);
      setCustName("");
      setCustPhone("");
      setCustService("");
      setAddDialogOpen(false);
      void emitActivity({ data: { actor: "QueueAI", text: `${custName.trim()} joined the queue` } });
    }
  }

  async function serveNext() {
    const next = queue.find((q) => q.status === "waiting");
    if (!next) {
      toast.info("No one is waiting in the queue");
      return;
    }

    const { error } = await supabase
      .from("queue_entries")
      .update({ status: "serving", served_at: new Date().toISOString() })
      .eq("id", next.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${next.customer_name} is now being served`);
      void emitActivity({ data: { actor: "QueueAI", text: `${next.customer_name} (${next.token}) is now being served at ${businessName}` } });

      if (next.customer_phone) {
        await dispatchWhatsApp({
          to: next.customer_phone,
          recipient: next.customer_name,
          templateId: "queue_you_are_next",
          body: "It's your turn.",
          workspaceId: activeWorkspace?.id,
          notify: false,
        });
      }
    }
  }

  async function completeServing(id: string, name: string) {
    const cust = queue.find((q) => q.id === id);
    const { error } = await supabase
      .from("queue_entries")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Completed serving ${name}`);
    }
  }

  async function customerExit(id: string, name: string) {
    const { error } = await supabase
      .from("queue_entries")
      .update({ status: "exited" })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${name} exited the queue`);
    }
  }

  const waitingList = queue.filter(q => q.status === "waiting" || q.status === "serving");
  const exitedCount = queue.filter(q => q.status === "exited").length;
  const exitRate = queue.length > 0 ? ((exitedCount / queue.length) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-10">
      {/* QueueAI Hero Banner */}
      <FadeUp className="shadow-float relative overflow-hidden rounded-[28px] border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-8 sm:p-12">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-[420px] rounded-full bg-white/[0.03] blur-[100px]" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white/60">
              <Users2 className="size-3" /> Virtual Queue Engine
            </div>
            <h1 className="font-display mt-5 text-balance text-4xl font-semibold tracking-[-0.035em] text-white sm:text-6xl">
              QueueAI <span className="text-gradient">Studio.</span>
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/60">
              Zero-wait virtual queues with automated WhatsApp updates, live ETA prediction, and exit recovery.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]">
                  <QrCode className="size-4" /> QR Poster
                </Button>
              </DialogTrigger>
              <DialogContent className="border-white/10 bg-[#141414] text-white sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-white">Scan to join queue</DialogTitle>
                  <DialogDescription className="text-white/60">{businessName}</DialogDescription>
                </DialogHeader>
                <div className="mx-auto flex flex-col items-center justify-center p-6 bg-white rounded-2xl">
                  <QRCodeSVG id="qr-code-svg" value={joinUrl} size={200} level="H" includeMargin={true} />
                  <p className="text-center text-xs text-black/60 font-mono mt-4 break-all max-w-xs">
                    {joinUrl}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Button variant="outline" size="sm" className="rounded-xl border-white/10 text-white" onClick={copyLink}>
                    <Copy className="size-3.5" /> Copy Link
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl border-white/10 text-white" onClick={downloadPNG}>
                    <Download className="size-3.5" /> Download PNG
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]">
                  <Plus className="size-4" /> Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="border-white/10 bg-[#141414] text-white sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-white">Add Customer to Queue</DialogTitle>
                  <DialogDescription className="text-white/60">Issue a new token for instant wait tracking.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-white/80">Customer Name</Label>
                    <Input value={custName} onChange={e => setCustName(e.target.value)} placeholder="Jane Doe" className="border-white/10 bg-white/[0.04] text-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/80">WhatsApp Phone</Label>
                    <Input value={custPhone} onChange={e => setCustPhone(e.target.value)} placeholder="+919876543210" className="border-white/10 bg-white/[0.04] text-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/80">Service Requested</Label>
                    <Input value={custService} onChange={e => setCustService(e.target.value)} placeholder="Consultation" className="border-white/10 bg-white/[0.04] text-white" />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddQueue} className="w-full rounded-xl bg-white text-black hover:bg-white/90">Add to Queue</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button onClick={serveNext} className="h-11 rounded-xl bg-white text-black hover:bg-white/90">
              Serve Next
            </Button>
          </div>
        </div>
      </FadeUp>

      {/* KPI Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Today's queue", value: String(queue.length), delta: "+15%", icon: Users2, hint: "total check-ins" },
          { label: "Currently waiting", value: String(queue.filter((q) => q.status === "waiting").length), hint: "in line", icon: Clock },
          { label: "Avg. wait time", value: queue.length > 0 ? "12m" : "0m", delta: "-4m", icon: TrendingUp, hint: "AI predicted" },
          { label: "Exit rate", value: `${exitRate}%`, delta: "-2.1%", trend: "down" as const, icon: LogOut, hint: `${exitedCount} exited` },
        ].map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <Tabs defaultValue="live">
        <TabsList className="rounded-xl border border-white/10 bg-white/[0.04] p-1">
          <TabsTrigger value="live" className="rounded-lg text-white/70 data-[state=active]:bg-white/10 data-[state=active]:text-white">Live Queue</TabsTrigger>
          <TabsTrigger value="insights" className="rounded-lg text-white/70 data-[state=active]:bg-white/10 data-[state=active]:text-white">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-6">
          <ChartCard title="Live Queue Tokens" subtitle="Real-time status updates as customers check in and finish service">
            {waitingList.length === 0 ? (
              <div className="py-16 text-center text-sm text-white/50">
                No active queue entries. Add a customer or share your business QR poster.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-white/50">Token</TableHead>
                    <TableHead className="text-white/50">Customer</TableHead>
                    <TableHead className="text-white/50">Service</TableHead>
                    <TableHead className="text-white/50">Waited</TableHead>
                    <TableHead className="text-white/50">AI ETA</TableHead>
                    <TableHead className="text-white/50">Status</TableHead>
                    <TableHead className="text-right text-white/50">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waitingList.map((c) => (
                    <TableRow key={c.token} className="border-white/[0.06]">
                      <TableCell className="font-mono text-xs font-semibold text-white">{c.token}</TableCell>
                      <TableCell className="font-medium text-white">{c.customer_name}</TableCell>
                      <TableCell className="text-white/60">{c.service || "—"}</TableCell>
                      <TableCell className="font-mono text-xs text-white/70">{c.waited}m</TableCell>
                      <TableCell className="font-mono text-xs text-white/70">{c.eta_minutes ? `${c.eta_minutes}m` : "—"}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            c.status === "serving"
                              ? "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)] border-none"
                              : "bg-white/[0.06] text-white/70 border-none"
                          }
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {c.status === "serving" ? (
                          <Button size="sm" variant="outline" className="rounded-lg border-white/10 text-white hover:bg-white/10" onClick={() => completeServing(c.id, c.customer_name)}>
                            Complete
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300" onClick={() => customerExit(c.id, c.customer_name)}>
                            Exit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ChartCard>
        </TabsContent>

        <TabsContent value="insights" className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { title: "Peak hour prediction", body: "Traffic forecast peaks at 4:30 PM. Allocate 2 additional counters." },
              { title: "Exit rate driver", body: "Wait notifications sent over WhatsApp cut walk-aways by 38%." },
              { title: "Satisfaction score", body: "Average customer rating remains 4.8/5 across recent check-ins." },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl border border-white/[0.06] bg-[color:var(--color-card)] p-6">
                <div className="grid size-9 place-items-center rounded-xl bg-white/[0.06] text-white">
                  <Sparkles className="size-4" />
                </div>
                <h4 className="font-display mt-4 text-base font-semibold text-white">{c.title}</h4>
                <p className="mt-1.5 text-sm text-white/60">{c.body}</p>
              </div>
            ))}
          </div>
          <CopilotPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

