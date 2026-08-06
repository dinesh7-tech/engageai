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
  Lock,
  Wand2,
  Loader2,
  KeyRound
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
import { getWhatsAppStatus, saveWhatsAppConfig } from "@/lib/whatsapp.functions";
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

  // Onboarding form state
  const [phoneId, setPhoneId] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [verifyToken, setVerifyToken] = useState("engageai_" + Math.random().toString(36).substring(2, 8));
  const [fromNumber, setFromNumber] = useState("");
  const [connecting, setConnecting] = useState(false);

  const status = useQuery({
    queryKey: ["whatsapp-status", activeWorkspace?.id],
    queryFn: () => getWhatsAppStatus({ data: activeWorkspace?.id || "" }),
  });

  const configured = status.data?.configured ?? false;
  const delivered = outbox.filter((o) => o.outcome === "sent").length;
  const simulated = outbox.filter((o) => o.outcome === "simulated").length;
  const failed = outbox.filter((o) => o.outcome === "failed").length;

  const businessName = activeWorkspace?.name || "Our Business";

  async function handleOnboardSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeWorkspace?.id) return;
    if (!phoneId || !businessId || !accessToken || !appId || !appSecret || !fromNumber) {
      toast.error("Please fill in all configuration credentials.");
      return;
    }

    setConnecting(true);
    try {
      await saveWhatsAppConfig({
        workspaceId: activeWorkspace?.id,
        phoneId: phoneId.trim(),
        businessId: businessId.trim(),
        accessToken: accessToken.trim(),
        appId: appId.trim(),
        appSecret: appSecret.trim(),
        verifyToken: verifyToken.trim(),
        fromNumber: fromNumber.trim()
      });

      toast.success("WhatsApp Business Account verified and connected successfully!");
      // Reset form fields
      setPhoneId("");
      setBusinessId("");
      setAccessToken("");
      setAppId("");
      setAppSecret("");
      setFromNumber("");
      status.refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to verify Meta API connection.");
    } finally {
      setConnecting(false);
    }
  }

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
        link: `https://engageai.vercel.app/join/${activeWorkspace?.slug || ""}`,
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
                ? "bg-success/15 text-success font-semibold"
                : "bg-warning/15 text-warning font-semibold"
            }
          >
            {status.isLoading ? "Checking…" : status.data?.mode || "Connected"}
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
            title="Provider Connection"
            subtitle={`${status.data?.provider ?? "Meta WhatsApp Cloud API"} · ${status.data?.mode || "EngageAI Shared Account"}`}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Account Mode</p>
                <p className="mt-1 font-semibold text-sm text-primary">
                  {status.data?.mode || "EngageAI Shared Account"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Outbound campaigns dispatch using official EngageAI business line.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Webhook Status</p>
                <p className="mt-1 font-semibold text-sm text-emerald-500">
                  Connected
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Endpoint: <span className="font-mono bg-accent/20 px-1 py-0.5 rounded text-[10px]">/api/webhooks/whatsapp</span>
                </p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Sender Number</p>
                <p className="mt-1 font-semibold text-sm font-mono">
                  {status.data?.fromNumber || "+14155238886"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Meta Verified Business Sender.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Phone Number ID</p>
                <p className="mt-1 font-mono text-xs font-semibold truncate">
                  {status.data?.phoneNumberId || "1315005068354564"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Meta App identifier.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Business Account ID</p>
                <p className="mt-1 font-mono text-xs font-semibold truncate">
                  {status.data?.businessAccountId || "1788292852179276"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Meta Business identifier.
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
                Sync Meta API Status
              </Button>
            </div>
          </ChartCard>

          <ChartCard 
            title="Custom WhatsApp Business Override (Optional)" 
            subtitle="Connect your own Meta Developer credentials to send campaigns from your private phone number"
          >
                <form onSubmit={handleOnboardSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="ob-phone-id">Phone Number ID</Label>
                      <Input 
                        id="ob-phone-id" 
                        value={phoneId} 
                        onChange={e => setPhoneId(e.target.value)} 
                        placeholder="E.g. 1315005068354564"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ob-business-id">Business Account ID</Label>
                      <Input 
                        id="ob-business-id" 
                        value={businessId} 
                        onChange={e => setBusinessId(e.target.value)} 
                        placeholder="E.g. 1788292852179276"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ob-token" className="flex items-center gap-1.5">
                      <KeyRound className="size-3.5" /> Access Token
                    </Label>
                    <Input 
                      id="ob-token" 
                      type="password"
                      value={accessToken} 
                      onChange={e => setAccessToken(e.target.value)} 
                      placeholder="Meta Graph Permanent System User Token"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="ob-app-id">Meta App ID</Label>
                      <Input 
                        id="ob-app-id" 
                        value={appId} 
                        onChange={e => setAppId(e.target.value)} 
                        placeholder="E.g. 4425691767747243"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ob-app-secret">Meta App Secret</Label>
                      <Input 
                        id="ob-app-secret" 
                        type="password"
                        value={appSecret} 
                        onChange={e => setAppSecret(e.target.value)} 
                        placeholder="••••••••••••••••••••••••••••••••"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="ob-from-num">Sender Phone Number</Label>
                      <Input 
                        id="ob-from-num" 
                        value={fromNumber} 
                        onChange={e => setFromNumber(e.target.value)} 
                        placeholder="+919820011234"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ob-verify-token">Webhook Verification Token</Label>
                      <Input 
                        id="ob-verify-token" 
                        value={verifyToken} 
                        onChange={e => setVerifyToken(e.target.value)} 
                        placeholder="Verification String"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full gap-2 bg-gradient-to-r from-primary to-indigo-600 hover:opacity-90"
                    disabled={connecting}
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Verifying Meta Connection...
                      </>
                    ) : (
                      <>
                        <Wand2 className="size-4" /> Verify & Connect Account
                      </>
                    )}
                  </Button>
                </form>
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
