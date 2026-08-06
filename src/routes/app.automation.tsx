import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowRight, Plus, Workflow, Zap } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/automation")({
  head: () => ({
    meta: [
      { title: "Automation Engine — EngageAI" },
      { name: "description", content: "Visual automation builder connecting queue, event and feedback triggers to WhatsApp, email, push and AI actions." },
    ],
  }),
  component: AutomationPage,
});

const triggerLibrary = [
  "Registration completed",
  "Queue joined",
  "Queue exit",
  "Event started",
  "Event ended",
  "Feedback pending",
  "Customer waiting",
  "Negative feedback",
];

const actionLibrary = [
  "WhatsApp",
  "Email",
  "Push notification",
  "Dashboard notification",
  "AI analysis",
  "Delay",
  "Condition",
];

interface Flow {
  id: string;
  name: string;
  trigger: string;
  actions: string[];
  runs: number;
  active: boolean;
}

function AutomationPage() {
  const { activeWorkspace } = useActiveWorkspace();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState(triggerLibrary[0]!);
  const [steps, setSteps] = useState<string[]>(["WhatsApp"]);
  const [loading, setLoading] = useState(true);

  const workspaceId = activeWorkspace?.id;

  // Fetch automation rules from database
  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    supabase
      .from("automation_rules")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error("Failed to load automation rules");
        } else {
          const mapped = (data || []).map((r: any) => ({
            id: r.id,
            name: r.action_config?.name || "Automation Rule",
            trigger: r.trigger_event,
            actions: r.action_config?.steps || [r.action_type],
            runs: 0,
            active: r.enabled,
          }));
          setFlows(mapped);
        }
        setLoading(false);
      });
  }, [workspaceId]);

  async function publish() {
    if (!name.trim()) {
      toast.error("Name your automation first");
      return;
    }
    if (!workspaceId) return;

    try {
      const { data: newRule, error } = await supabase
        .from("automation_rules")
        .insert({
          workspace_id: workspaceId,
          trigger_event: trigger,
          action_type: steps[0] || "WhatsApp",
          action_config: { steps, name: name.trim() },
          enabled: true,
        })
        .select("*")
        .single();

      if (error) {
        toast.error(error.message);
      } else {
        setFlows((f) => [
          {
            id: newRule.id,
            name: name.trim(),
            trigger,
            actions: steps,
            runs: 0,
            active: true,
          },
          ...f,
        ]);
        setName("");
        setSteps(["WhatsApp"]);
        toast.success("Automation published and listening for its trigger");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to publish rule");
    }
  }

  async function toggleRule(f: Flow, v: boolean) {
    const { error } = await supabase
      .from("automation_rules")
      .update({ enabled: v })
      .eq("id", f.id);

    if (error) {
      toast.error(error.message);
    } else {
      setFlows((list) => list.map((x) => (x.id === f.id ? { ...x, active: v } : x)));
      toast.success(`${f.name} ${v ? "activated" : "paused"}`);
    }
  }

  return (
    <>
      <PageHeader
        title="Automation Engine"
        description="Chain triggers, conditions, delays and actions across every module."
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="panel p-5">
          <h3 className="font-display text-base font-semibold">Visual builder</h3>
          <p className="mt-1 text-xs text-muted-foreground">Compose a flow, then publish it to the workspace.</p>

          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="flow-name">Automation name</Label>
              <Input id="flow-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Peak-hour overflow alert" />
            </div>

            <div className="space-y-2">
              <Label>Trigger</Label>
              <Select value={trigger} onValueChange={setTrigger}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {triggerLibrary.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Actions</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
                  <Zap className="size-4 text-primary" />
                  <span className="font-medium">When: {trigger}</span>
                </div>
                {steps.map((s, i) => (
                  <div key={`${s}-${i}`} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/50 px-4 py-3 text-sm">
                    <ArrowRight className="size-4 text-muted-foreground" />
                    <span>{s}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto text-muted-foreground"
                      onClick={() => setSteps((st) => st.filter((_, idx) => idx !== i))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {actionLibrary.map((a) => (
                  <button
                    key={a}
                    onClick={() => setSteps((st) => [...st, a])}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    <Plus className="size-3" /> {a}
                  </button>
                ))}
              </div>
            </div>

            <Button className="w-full" onClick={publish}>Publish automation</Button>
          </div>
        </section>

        <section className="space-y-3">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground panel animate-pulse">
              Loading automation flows...
            </div>
          ) : flows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground panel">
              No custom automations built in this workspace. Setup your triggers in the visual builder.
            </div>
          ) : (
            flows.map((f) => (
              <div key={f.id} className="panel p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="flex items-center gap-2 font-display text-base font-semibold">
                      <Workflow className="size-4 text-primary" /> {f.name}
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground">When: {f.trigger}</p>
                  </div>
                  <Switch
                    checked={f.active}
                    onCheckedChange={(v) => toggleRule(f, v)}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {f.actions.map((a, i) => (
                    <span key={`${a}-${i}`} className="flex items-center gap-1.5">
                      <Badge variant="secondary">{a}</Badge>
                      {i < f.actions.length - 1 && <ArrowRight className="size-3 text-muted-foreground" />}
                    </span>
                  ))}
                </div>
                <p className={cn("mt-3 text-xs", f.active ? "text-success" : "text-muted-foreground")}>
                  {f.runs.toLocaleString()} runs · {f.active ? "Live" : "Paused"}
                </p>
              </div>
            ))
          )}
        </section>
      </div>
    </>
  );
}
