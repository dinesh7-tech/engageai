import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Building2, Globe, Clock, Loader2, ArrowRight, Check, Sparkles, Cpu, Layers } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/app/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "AI Business Setup Wizard — EngageAI" },
      { name: "description", content: "AI setup assistant for your new business operations workspace." },
    ],
  }),
  component: OnboardingPage,
});

const templates = [
  { id: "Salon", name: "Salon & Spa", modules: ["Queue Line", "Customer Reviews"], desc: "Preconfigures queue lists, customer review logs, and wait notifications." },
  { id: "Restaurant", name: "Restaurant & Café", modules: ["Queue Line", "Customer Reviews"], desc: "Preconfigures dining table waiting queues and dining experience reviews." },
  { id: "Clinic", name: "Clinic & Hospital", modules: ["Queue Line", "Customer Reviews"], desc: "Sets up walk-in appointment waitlists and clinic reviews." },
  { id: "Events", name: "Events & Entertainment", modules: ["Event Registry", "Customer Reviews"], desc: "Configures registration check-ins and speaker/panel reviews." },
  { id: "Retail", name: "Retail Store", modules: ["Queue Line", "Customer Reviews"], desc: "Sets up billing line queues and checkout experience forms." },
  { id: "Other", name: "Other Operations", modules: ["Queue Line", "Event Registry", "Customer Reviews"], desc: "General workspace setup with all configuration blocks." },
];

const timezones = ["Asia/Kolkata", "America/New_York", "Europe/London", "Asia/Singapore"];
const countries = [
  { code: "IN", name: "India" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "SG", name: "Singapore" },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const { createWorkspace } = useActiveWorkspace();
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [step, setStep] = useState(1);

  const [businessName, setBusinessName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("Salon");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [country, setCountry] = useState("IN");

  // Force authentication & email verification check on mount
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        toast.error("Authentication required to access Setup Wizard");
        navigate({ to: "/auth" });
        return;
      }

      // MANDATORY EMAIL VERIFICATION GATE
      if (!session.user.email_confirmed_at) {
        toast.info("Please verify your email before starting setup.");
        navigate({ to: "/verify-email" });
        return;
      }

      const { data: memberships } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", session.user.id)
        .limit(1);

      if (memberships && memberships.length > 0) {
        navigate({ to: "/app" });
      } else {
        setAuthChecking(false);
      }
    });
  }, [navigate]);

  async function handleCompleteWizard() {
    if (!businessName.trim()) {
      toast.error("Please enter a business name");
      return;
    }
    setLoading(true);
    try {
      // Create actual workspace and trigger config setup
      await createWorkspace({
        name: businessName.trim(),
        category: selectedTemplate,
        timezone,
        country,
      });

      toast.success("AI Business Setup complete!");
      navigate({ to: "/app" });
    } catch (err: any) {
      toast.error(err?.message || "Setup failed");
    } finally {
      setLoading(false);
    }
  }

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentTemplateObj = templates.find((t) => t.id === selectedTemplate) || templates[0]!;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 hero-glow" />
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-xl"
      >
        <div className="mb-6 flex items-center justify-center">
          <Logo />
        </div>

        <div className="panel p-6 sm:p-8">
          {/* Progress Header */}
          <div className="mb-6 flex items-center gap-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`grid size-7 place-items-center rounded-full text-xs font-semibold ${
                  step >= s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}>
                  {step > s ? <Check className="size-3.5" /> : s}
                </div>
                {s < 3 && <div className={`h-0.5 w-12 ${step > s ? "bg-primary" : "bg-border"}`} />}
              </div>
            ))}
            <span className="ml-auto text-xs text-muted-foreground uppercase font-semibold tracking-wider">
              Step {step} of 3
            </span>
          </div>

          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
              <div>
                <h1 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Building2 className="size-5 text-primary" /> Business Operations
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">Name your operation and locate local region settings.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="biz-name">Business Name</Label>
                <Input
                  id="biz-name"
                  placeholder="e.g. Paramount Hair Salon"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                className="w-full gap-2 mt-2"
                onClick={() => {
                  if (!businessName.trim()) { toast.error("Enter a business name"); return; }
                  setStep(2);
                }}
              >
                Continue to Template <ArrowRight className="size-4" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
              <div>
                <h1 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Layers className="size-5 text-primary" /> Select Business Template
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">Select operational category to pre-program workspace logic.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedTemplate === t.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/60 hover:bg-secondary/40"
                    }`}
                  >
                    <h4 className="font-semibold text-sm">{t.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.desc}</p>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1 gap-2" onClick={() => setStep(3)}>
                  Analyze Setup <ArrowRight className="size-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
              <div>
                <h1 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" /> AI Operational Recommendation
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">AI has pre-configured the following operational modules based on your template selection.</p>
              </div>

              <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span className="text-xs text-muted-foreground">Target Category</span>
                  <span className="font-medium text-sm">{currentTemplateObj.name}</span>
                </div>
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground block">Auto-Installing Modules</span>
                  <div className="flex flex-wrap gap-2">
                    {currentTemplateObj.modules.map((m) => (
                      <Badge key={m} className="bg-primary/10 text-primary border-none">
                        <Cpu className="size-3 mr-1" /> {m}
                      </Badge>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Ready to activate config directories. No dummy mock customer entries will be written.
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
                <Button className="flex-1 gap-2" disabled={loading} onClick={handleCompleteWizard}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : "Deploy Workspace"}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
