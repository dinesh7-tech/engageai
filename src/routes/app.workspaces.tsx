import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Check, Plus, Users2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/workspaces")({
  head: () => ({
    meta: [
      { title: "Workspaces — EngageAI" },
      { name: "description", content: "Switch between EngageAI workspaces, review plans, members and module health." },
      { property: "og:title", content: "Workspaces — EngageAI" },
      { property: "og:description", content: "Switch between EngageAI workspaces, review plans, members and module health." },
    ],
  }),
  component: WorkspacesPage,
});

function WorkspacesPage() {
  const { workspaceList, activeId, setActiveWorkspace, createWorkspace } = useActiveWorkspace();
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const ws = await createWorkspace({
        name: name.trim(),
        category: "Other",
        timezone: "Asia/Kolkata",
        country: "IN",
      });
      setName("");
      setOpen(false);
      toast.success(`${ws.name} created and set as active`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Workspaces"
        description="Each workspace has isolated data, members, modules and automations."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="size-4" /> New workspace
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create workspace</DialogTitle>
                <DialogDescription>
                  Workspaces keep customers, events and feedback fully isolated.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="ws-name">Workspace name</Label>
                <Input
                  id="ws-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Harbour Clinics"
                />
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? "Creating..." : "Create workspace"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workspaceList.map((ws) => {
          const active = ws.id === activeId;
          return (
            <div
              key={ws.id}
              className={cn(
                "panel p-5 transition-colors",
                active && "border-primary/50 shadow-[var(--shadow-glow)]",
              )}
            >
              <div className="flex items-start justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-accent text-primary">
                  <Building2 className="size-5" />
                </span>
                <Badge variant={active ? "default" : "secondary"}>{ws.plan}</Badge>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{ws.name}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users2 className="size-3.5" /> 1 member
              </p>
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                  <span>Workspace health</span>
                  <span>100%</span>
                </div>
                <Progress value={100} className="h-1.5" />
              </div>
              <Button
                className="mt-5 w-full gap-2"
                variant={active ? "secondary" : "default"}
                onClick={() => {
                  setActiveWorkspace(ws.id);
                  toast.success(`Switched to ${ws.name}`);
                }}
              >
                {active ? <><Check className="size-4" /> Current workspace</> : "Switch to workspace"}
              </Button>
            </div>
          );
        })}
      </div>
    </>
  );
}
