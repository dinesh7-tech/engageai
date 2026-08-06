import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  CheckCircle2,
  Eye,
  MessageCircle,
  PlugZap,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { ChartCard } from "@/components/app/ChartCard";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getWhatsAppStatus } from "@/lib/whatsapp.functions";
import { clearOutbox, dispatchWhatsApp, useWhatsAppOutbox } from "@/lib/whatsapp-client";
import {
  maskPhone,
  renderTemplate,
  whatsappTemplates,
  type WhatsAppTemplate,
} from "@/lib/whatsapp-templates";

export const Route = createFileRoute("/app/whatsapp")({
  head: () => ({
    meta: [
      { title: "WhatsApp Provider — Notifications & Templates | EngageAI" },
      {
        name: "description",
        content:
          "Configure the WhatsApp Business provider, manage queue, event and feedback templates, and audit every message EngageAI sends.",
      },
      { property: "og:title", content: "WhatsApp Provider — EngageAI" },
      {
        property: "og:description",
        content: "Provider status, message templates and a full delivery log for every WhatsApp notification.",
      },
    ],
  }),
  component: WhatsAppPage,
});

function WhatsAppPage() {
  const outbox = useWhatsAppOutbox();
  const { activeWorkspace } = useActiveWorkspace();
  const [preview, setPreview] = useState<WhatsAppTemplate | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testTemplate, setTestTemplate] = useState(whatsappTemplates[0]!.id);
  const [testBody, setTestBody] = useState("");
  const [sending, setSending] = useState(false);

  const status = useQuery({
    queryKey: ["whatsapp-status", activeWorkspace?.id],
    queryFn: () => getWhatsAppStatus({ data: activeWorkspace?.id || "" }),
  });

  const configured = status.data?.configured ?? false;
  const delivered = outbox.filter((o) => o.outcome === "sent").length;
  const simulated = outbox.filter((o) => o.outcome === "simulated").length;
  const failed = outbox.filter((o) => o.outcome === "failed").length;

  const businessName = activeWorkspace?.name || "Our Business";

  async function sendTest() {
    if (!testPhone) {
      toast.error("Enter a recipient phone number");
      return;
    }
    setSending(true);
    await dispatchWhatsApp({
      to: testPhone,
      recipient: maskPhone(testPhone),
      templateId: testTemplate,
      variables: {
        name: "Customer",
        business: businessName,
        token: "A-101",
        position: 1,
        eta: 10,
        event: "Sample Event",
        date: "Today",
        venue: "Main Hall",
        link: `${import.meta.env['VITE_APP_URL'] || window.location.origin}/join/${activeWorkspace?.slug || "biz"}`,
        issue: "waiting time",
      },
      workspaceId: activeWorkspace?.id,
      ...(testBody.trim() ? { body: testBody.trim() } : {}),
    });
    setSending(false);
  }

  return (
    <>
      <PageHeader
        title="WhatsApp provider"
        description="One outbound channel powering registration, queue, event and feedback notifications."
        actions={
          <Badge
            className={
              configured
                ? "bg-success/15 text-success"
                : "bg-warning/15 text-warning"
            }
          >
            {status.isLoading ? "Checking…" : configured ? "Connected" : "Simulation mode"}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Messages logged", value: String(outbox.length), icon: MessageCircle, hint: "this session" },
          { label: "Delivered", value: String(delivered), icon: CheckCircle2, hint: "provider accepted" },
          { label: "Simulated", value: String(simulated), icon: PlugZap, hint: "provider not connected" },
          { label: "Failed", value: String(failed), icon: ShieldCheck, hint: "needs attention", trend: "down" as const },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="connection">
        <TabsList>
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="log">Delivery log</TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="mt-6 space-y-6">
          <ChartCard
            title="Provider"
            subtitle={status.data?.provider ?? "Meta WhatsApp Cloud API"}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                <p className="mt-1 font-semibold text-sm">
                  {configured ? "Connected" : "Simulation Mode"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {configured
                    ? "Credentials active — messages will deliver for real."
                    : "Webhook & API keys not active — messages are simulated in logs."}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Webhook Status</p>
                <p className="mt-1 font-semibold text-sm">
                  {status.data?.webhookStatus ?? "Disconnected"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Endpoint: <span className="font-mono bg-accent/20 px-1 py-0.5 rounded text-[10px]">/api/webhooks/whatsapp</span>
                </p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Sender Number</p>
                <p className="mt-1 font-semibold text-sm">
                  {status.data?.fromNumber || "—"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Configured phone number.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Phone Number ID</p>
                <p className="mt-1 font-mono text-xs font-semibold truncate">
                  {status.data?.phoneNumberId || "—"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Meta App identifier.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Business Account ID</p>
                <p className="mt-1 font-mono text-xs font-semibold truncate">
                  {status.data?.businessAccountId || "—"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Meta Business identifier.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Last Message</p>
                <p className="mt-1 text-xs truncate font-semibold">
                  {status.data?.lastMessage || "—"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Body of last notification.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Messages Today</p>
                <p className="mt-1 font-semibold text-sm">
                  {status.data?.messagesToday ?? 0}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sent & received today.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await status.refetch();
                  toast.success("Refetched WhatsApp provider configuration");
                }}
              >
                Reconnect Provider
              </Button>
            </div>

            <h4 className="mt-6 font-semibold text-sm text-foreground">Meta Setup Instructions</h4>
            <ol className="mt-3 space-y-3 text-sm text-muted-foreground">
              {[
                "Create a Meta Developer App under your Meta Business Account.",
                "Verify your business phone number and get the Temporary/Permanent access token.",
                "Configure WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in environment variables.",
                "In Webhooks section of Meta, point to /api/webhooks/whatsapp and verify with your WHATSAPP_VERIFY_TOKEN.",
              ].map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-medium text-primary">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </ChartCard>

          <ChartCard title="Test console" subtitle="Send any template to a real number to verify the pipeline end to end">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="wa-phone">WhatsApp number</Label>
                <Input
                  id="wa-phone"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+919820011234"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wa-template">Template</Label>
                <select
                  id="wa-template"
                  value={testTemplate}
                  onChange={(e) => setTestTemplate(e.target.value as WhatsAppTemplate["id"])}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {whatsappTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.module} · {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="wa-body">Custom body (optional)</Label>
              <Textarea
                id="wa-body"
                value={testBody}
                onChange={(e) => setTestBody(e.target.value)}
                placeholder="Leave empty to use the template with sample values"
                className="min-h-24"
              />
            </div>
            <Button className="mt-4 gap-2" onClick={sendTest} disabled={sending}>
              <Send className="size-4" /> {sending ? "Sending…" : "Send test message"}
            </Button>
          </ChartCard>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {whatsappTemplates.map((t) => (
              <div key={t.id} className="panel flex flex-col p-5">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{t.module}</Badge>
                  <Badge className="bg-success/15 text-success">Approved</Badge>
                </div>
                <h3 className="mt-3 font-display text-base font-semibold">{t.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                <p className="mt-3 font-mono text-[11px] text-muted-foreground">
                  {t.variables.map((v) => `{{${v}}}`).join(" ")}
                </p>
                <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => setPreview(t)}>
                  <Eye className="size-4" /> Preview
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="log" className="mt-6">
          <ChartCard
            title="Delivery log"
            subtitle="Every WhatsApp message sent from any module, newest first"
            actions={
              outbox.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    clearOutbox();
                    toast.success("Delivery log cleared");
                  }}
                >
                  <Trash2 className="size-4" /> Clear
                </Button>
              ) : undefined
            }
          >
            {outbox.length === 0 ? (
              <EmptyState
                icon={MessageCircle}
                title="No messages yet"
                description="Serve a customer in QueueAI, send an event reminder or request feedback — every WhatsApp message lands here."
              />
            ) : (
              <ul className="divide-y divide-border">
                {outbox.map((entry) => (
                  <li key={entry.id} className="py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{entry.recipient}</span>
                      <span className="font-mono text-xs text-muted-foreground">{maskPhone(entry.to)}</span>
                      <Badge variant="secondary">{entry.module}</Badge>
                      <Badge variant="secondary">{entry.templateName}</Badge>
                      <Badge
                        className={
                          entry.outcome === "sent"
                            ? "bg-success/15 text-success"
                            : entry.outcome === "failed"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-warning/15 text-warning"
                        }
                      >
                        {entry.outcome}
                      </Badge>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(entry.sentAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{entry.body}</p>
                    {entry.error && <p className="mt-2 text-xs text-destructive">{entry.error}</p>}
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>
        </TabsContent>
      </Tabs>

      <Dialog open={preview !== null} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
            <DialogDescription>{preview?.description}</DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="rounded-2xl border border-border bg-secondary/60 p-4">
              <p className="whitespace-pre-line text-sm leading-relaxed">
                {renderTemplate(preview.id, {
                  name: "Customer",
                  business: businessName,
                  token: "A-101",
                  position: 1,
                  eta: 10,
                  event: "Sample Event",
                  date: "Today",
                  venue: "Main Hall",
                  link: `https://engageai.app/p/${activeWorkspace?.slug || "biz"}`,
                  issue: "waiting time",
                })}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
