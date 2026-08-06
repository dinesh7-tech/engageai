import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Users2, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { dispatchWhatsApp } from "@/lib/whatsapp-client";

export const Route = createFileRoute("/join/$slug")({
  component: JoinQueuePortal,
  head: () => ({
    meta: [
      { title: "Join Queue — EngageAI" },
      { name: "description", content: "Check-in to join the business waitlist." },
    ],
  }),
});

function JoinQueuePortal() {
  const { slug } = Route.useParams();
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [service, setService] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<any>(null);

  // Fetch workspace details on mount
  useEffect(() => {
    supabase
      .from("workspaces")
      .select("*")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        setWorkspace(data);
        setLoading(false);
      });
  }, [slug]);

  async function handleCheckIn() {
    if (!fullName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setSubmitting(true);
    try {
      // 1. Calculate token (count of today's queue entries + 1)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { count: dailyCount } = await supabase
        .from("queue_entries")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .gte("created_at", todayStart.toISOString());

      const nextTokenNumber = (dailyCount || 0) + 1;
      const token = `Q-${nextTokenNumber}`;

      // 2. Calculate estimated wait time (15 mins * count of currently waiting entries)
      const { count: waitingCount } = await supabase
        .from("queue_entries")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .eq("status", "waiting");

      const estimatedWait = (waitingCount || 0) * 15;

      // 3. Insert queue entry
      const { data: newEntry, error } = await supabase
        .from("queue_entries")
        .insert({
          workspace_id: workspace.id,
          customer_name: fullName.trim(),
          customer_phone: phoneNumber.trim() || null,
          service: service.trim() || null,
          token,
          eta_minutes: estimatedWait,
          status: "waiting",
        })
        .select("*")
        .single();

      if (error) throw error;

      if (newEntry.customer_phone) {
        await dispatchWhatsApp({
          to: newEntry.customer_phone,
          recipient: newEntry.customer_name,
          templateId: "queue_joined",
          variables: {
            name: newEntry.customer_name,
            position: (waitingCount || 0) + 1,
            eta: newEntry.eta_minutes,
          },
          workspaceId: workspace.id,
          notify: false,
        });
      }

      setTicket({
        token: newEntry.token,
        eta: newEntry.eta_minutes,
        peopleAhead: waitingCount || 0,
      });
      toast.success("Successfully joined the queue!");
    } catch (err: any) {
      toast.error(err.message || "Failed to join queue");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center space-y-3">
          <AlertCircle className="size-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">Workspace Not Found</h2>
          <p className="text-muted-foreground text-sm">We couldn't find a check-in portal for '{slug}'.</p>
        </div>
      </div>
    );
  }

  if (ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md border-border/80 bg-card">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto size-12 rounded-full bg-primary/10 grid place-items-center mb-2">
              <CheckCircle2 className="size-6 text-primary" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">Joined Waitlist!</CardTitle>
            <p className="text-sm text-muted-foreground">{workspace.name}</p>
          </CardHeader>
          <CardContent className="space-y-6 pt-4 text-center">
            <div className="panel p-6 bg-accent/20 rounded-2xl">
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Your Ticket</span>
              <h1 className="text-5xl font-display font-extrabold tracking-tight text-primary mt-2">{ticket.token}</h1>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="panel p-4 bg-card text-center">
                <Clock className="size-4 text-primary mx-auto mb-1.5" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Estimated Wait</span>
                <span className="text-sm font-bold mt-1 block">
                  {ticket.eta === 0 ? "Under 5 mins" : `${ticket.eta} mins`}
                </span>
              </div>
              <div className="panel p-4 bg-card text-center">
                <Users2 className="size-4 text-primary mx-auto mb-1.5" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Ahead of You</span>
                <span className="text-sm font-bold mt-1 block">
                  {ticket.peopleAhead === 0 ? "You're next!" : `${ticket.peopleAhead} ${ticket.peopleAhead === 1 ? 'person' : 'people'}`}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Please take a screenshot of this ticket. We will send updates to your phone if provided.
            </p>
            <Button className="w-full mt-2" onClick={() => setTicket(null)}>
              Check-in Someone Else
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-border/80 bg-card">
        <CardHeader className="text-center">
          <Badge className="bg-primary/20 text-primary border-none rounded-full px-3 py-1 mx-auto mb-2">
            {workspace.category} Portal
          </Badge>
          <CardTitle className="text-xl font-bold tracking-tight">{workspace.name}</CardTitle>
          <p className="text-xs text-muted-foreground">Join our digital waitlist line. Fill out your details below.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Your Full Name</label>
              <Input
                placeholder="e.g. Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">WhatsApp Phone (Optional)</label>
              <Input
                placeholder="e.g. +9198200XXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Requested Service (Optional)</label>
              <Input
                placeholder="e.g. Haircut, Consultation"
                value={service}
                onChange={(e) => setService(e.target.value)}
              />
            </div>
          </div>

          <Button
            className="w-full gap-2 mt-4"
            disabled={submitting}
            onClick={handleCheckIn}
          >
            <Users2 className="size-4" /> Join Waitlist Queue
          </Button>

          <p className="text-[10px] text-center text-muted-foreground mt-4">
            Powered by EngageAI Business OS. No spam. Real-time wait notifications sent over SMS/WhatsApp.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
