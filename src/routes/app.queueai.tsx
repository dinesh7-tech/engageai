import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Clock, LogOut, QrCode, Sparkles, TrendingUp, Users2, Plus, Copy, Download, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  waited: number; // calculated locally/derived
  eta_minutes: number;
}

const pieColors = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)"];

function QueueAIPage() {
  const { activeWorkspace } = useActiveWorkspace();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  // Add form fields
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custService, setCustService] = useState("");

  const businessName = activeWorkspace?.name || "Our Business";
  const workspaceId = activeWorkspace?.id;

  const joinUrl = `https://engageai.vercel.app/join/${activeWorkspace?.slug || ""}`;

  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    toast.success("Check-in link copied to clipboard!");
  };

  const downloadSVG = () => {
    const svgEl = document.getElementById("qr-code-svg");
    if (!svgEl) return;
    const svgSerializer = new XMLSerializer();
    const svgString = svgSerializer.serializeToString(svgEl);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = `${activeWorkspace?.slug || "workspace"}-qr.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    toast.success("SVG downloaded!");
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

  const printQR = () => {
    const svgEl = document.getElementById("qr-code-svg");
    if (!svgEl) return;
    const svgString = new XMLSerializer().serializeToString(svgEl);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print QR Code - ${businessName}</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                font-family: sans-serif;
              }
              svg {
                width: 300px;
                height: 300px;
              }
              h2 {
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            \${svgString}
            <h2>Scan to join queue</h2>
            <p>\${businessName}</p>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
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

    // Subscribe to realtime updates
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

    // Generate Token (e.g. A-101)
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

      // Notify the customer currently being served
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

      // Notify the upcoming waiting user if any
      const upcoming = queue.filter((q) => q.status === "waiting" && q.id !== next.id)[0];
      if (upcoming && upcoming.customer_phone) {
        await dispatchWhatsApp({
          to: upcoming.customer_phone,
          recipient: upcoming.customer_name,
          templateId: "queue_you_are_next",
          variables: { name: upcoming.customer_name, token: upcoming.token, business: businessName },
          workspaceId: activeWorkspace?.id,
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
      if (cust && cust.customer_phone) {
        await dispatchWhatsApp({
          to: cust.customer_phone,
          recipient: cust.customer_name,
          templateId: "feedback_request",
          variables: {
            name: cust.customer_name,
            business: businessName,
            link: `https://engageai.vercel.app/join/${activeWorkspace?.slug || ""}`,
          },
          workspaceId: activeWorkspace?.id,
          notify: false,
        });
      }
    }
  }

  async function customerExit(id: string, name: string) {
    const cust = queue.find((q) => q.id === id);
    const { error } = await supabase
      .from("queue_entries")
      .update({ status: "exited" })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${name} exited the queue`);
      if (cust && cust.customer_phone) {
        await dispatchWhatsApp({
          to: cust.customer_phone,
          recipient: cust.customer_name,
          templateId: "queue_exit_recovery",
          body: "You missed your turn.",
          workspaceId: activeWorkspace?.id,
          notify: false,
        });
      }
    }
  }

  async function notifyJoin(customer: QueueItem) {
    if (!customer.customer_phone) {
      toast.error("No phone number specified for this customer");
      return;
    }
    const position = queue.filter((q) => q.status === "waiting").findIndex((q) => q.id === customer.id) + 1;
    await dispatchWhatsApp({
      to: customer.customer_phone,
      recipient: customer.customer_name,
      templateId: "queue_joined",
      variables: {
        name: customer.customer_name,
        position: position > 0 ? position : 1,
        eta: customer.eta_minutes ?? 0,
      },
      workspaceId: activeWorkspace?.id,
    });
  }

  async function recoverExit(customer: QueueItem) {
    if (!customer.customer_phone) return;
    await dispatchWhatsApp({
      to: customer.customer_phone,
      recipient: customer.customer_name,
      templateId: "queue_exit_recovery",
      variables: {
        name: customer.customer_name,
        link: `https://engageai.vercel.app/join/${activeWorkspace?.slug || ""}`,
      },
    });
  }

  const waitingList = queue.filter(q => q.status === "waiting" || q.status === "serving");
  const exitedCount = queue.filter(q => q.status === "exited").length;
  const exitRate = queue.length > 0 ? ((exitedCount / queue.length) * 100).toFixed(1) : "0";

  return (
    <>
      <PageHeader
        title="QueueAI"
        description="Virtual queue management with AI waiting prediction and WhatsApp automation."
        actions={
          <div className="flex items-center gap-2">
            <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <QrCode className="size-4" /> Business QR
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Scan to join queue</DialogTitle>
                  <DialogDescription>{businessName}</DialogDescription>
                </DialogHeader>
                <div className="mx-auto flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-border shadow-sm">
                  <QRCodeSVG
                    id="qr-code-svg"
                    value={joinUrl}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                  <p className="text-center text-xs text-muted-foreground font-mono mt-4 break-all max-w-xs select-all">
                    {joinUrl}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={copyLink}>
                    <Copy className="size-3.5" /> Copy Link
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={printQR}>
                    <Printer className="size-3.5" /> Print QR
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadPNG}>
                    <Download className="size-3.5" /> Download PNG
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadSVG}>
                    <Download className="size-3.5" /> Download SVG
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="size-4" /> Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Add to Queue</DialogTitle>
                  <DialogDescription>Input waiting customer information.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="cust-name">Full Name</Label>
                    <Input id="cust-name" value={custName} onChange={e => setCustName(e.target.value)} placeholder="John Doe" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cust-phone">WhatsApp Number</Label>
                    <Input id="cust-phone" value={custPhone} onChange={e => setCustPhone(e.target.value)} placeholder="+9198200XXXXX" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cust-service">Service requested</Label>
                    <Input id="cust-service" value={custService} onChange={e => setCustService(e.target.value)} placeholder="Haircut, Consultation, etc." />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddQueue} className="w-full">Insert & Notify</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button size="sm" onClick={serveNext}>Serve next</Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Today's queue", value: String(queue.length), delta: "+0.0%", icon: Users2, hint: "joins" },
          { label: "Customers waiting", value: String(queue.filter((q) => q.status === "waiting").length), hint: "right now", icon: Clock },
          { label: "Avg. waiting time", value: queue.length > 0 ? "12m" : "0m", delta: "0%", icon: TrendingUp, hint: "AI predicted" },
          { label: "Exit rate", value: `${exitRate}%`, delta: "0%", trend: "down" as const, icon: LogOut, hint: `${exitedCount} exits` },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="live">
        <TabsList>
          <TabsTrigger value="live">Live queue</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="insights">AI insights</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-6">
          <ChartCard title="Live queue" subtitle="Positions update in real time as customers are served">
            {waitingList.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                No active queue entries. Add a customer to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Token</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Waited</TableHead>
                    <TableHead>AI ETA</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waitingList.map((c) => (
                    <TableRow key={c.token}>
                      <TableCell className="font-mono text-xs">{c.token}</TableCell>
                      <TableCell className="font-medium">{c.customer_name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.service || "—"}</TableCell>
                      <TableCell>{c.waited}m</TableCell>
                      <TableCell>{c.eta_minutes ? `${c.eta_minutes}m` : "—"}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            c.status === "serving"
                              ? "bg-primary/15 text-primary"
                              : "bg-secondary text-muted-foreground"
                          }
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right flex justify-end gap-1">
                        {c.status === "serving" ? (
                          <Button size="sm" variant="outline" onClick={() => completeServing(c.id, c.customer_name)}>
                            Complete
                          </Button>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => notifyJoin(c)}>
                              Ping
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => customerExit(c.id, c.customer_name)}>
                              Exit
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ChartCard>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6 space-y-6">
          <div className="p-8 text-center text-sm text-muted-foreground panel">
            Analytics metrics will populate as operational queue histories are captured.
          </div>
        </TabsContent>

        <TabsContent value="insights" className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { title: "Peak hour prediction", body: "Predicted peak traffic is calculated continuously. Run live cycles to trigger forecasts." },
              { title: "Exit driver", body: "Cap waiting indicators below threshold limits to decrease voluntary dropouts." },
              { title: "Rating uplift", body: "Push automated WhatsApp wait notifications to increase customer check-in satisfaction." },
            ].map((c) => (
              <div key={c.title} className="panel p-5">
                <span className="grid size-9 place-items-center rounded-lg bg-accent text-primary">
                  <Sparkles className="size-4" />
                </span>
                <h4 className="mt-3 font-display text-base font-semibold">{c.title}</h4>
                <p className="mt-1.5 text-sm text-muted-foreground">{c.body}</p>
              </div>
            ))}
          </div>
          <CopilotPanel />
        </TabsContent>
      </Tabs>
    </>
  );
}
