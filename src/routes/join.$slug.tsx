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

import { z } from "zod";

const searchSchema = z.object({
  ticket: z.string().optional(),
});

export const Route = createFileRoute("/join/$slug")({
  validateSearch: (search) => searchSchema.parse(search),
  component: JoinQueuePortal,
  head: () => ({
    meta: [
      { title: "Join Queue — EngageAI" },
      { name: "description", content: "Check-in to join the business waitlist." },
    ],
  }),
});

import { useNavigate } from "@tanstack/react-router";

function JoinQueuePortal() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { ticket: ticketId } = Route.useSearch();

  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [service, setService] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [waitingCount, setWaitingCount] = useState<number>(0);
  const [ticketData, setTicketData] = useState<any>(null);
  const [peopleAhead, setPeopleAhead] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch workspace details and active stats on mount / slug change
  useEffect(() => {
    if (!slug) return;

    async function loadWorkspaceAndStats() {
      setLoading(true);
      setError(null);
      console.log("[QueueAI Public Join] Requested workspace slug:", slug);

      try {
        let { data: wsData, error: wsError } = await supabase
          .from("workspaces")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();

        if (!wsData && !wsError) {
          // Fallback: search by workspace id or case-insensitive slug
          const { data: fallbackWs } = await supabase
            .from("workspaces")
            .select("*")
            .ilike("slug", slug)
            .maybeSingle();
          if (fallbackWs) wsData = fallbackWs;
        }

        console.log("[QueueAI Public Join] Workspace lookup result:", { data: wsData, error: wsError });
        if (wsError) {
          setError(wsError.message);
          setLoading(false);
          return;
        }

        if (!wsData) {
          setWorkspace(null);
          setLoading(false);
          return;
        }

        setWorkspace(wsData);

        // Fetch current waiting entries count
        const { count, error: qError } = await supabase
          .from("queue_entries")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", wsData.id)
          .eq("status", "waiting");
        
        console.log("[QueueAI Public Join] Queue lookup result (waiting count):", { count, error: qError });

        if (!qError) {
          setWaitingCount(count || 0);
        }
      } catch (err: any) {
        console.error("[JoinPortal] Database fetch exception:", err);
        setError(err.message || "Failed to query workspace");
      } finally {
        setLoading(false);
      }
    }

    loadWorkspaceAndStats();
  }, [slug]);

  const fetchTicketDetails = async () => {
    if (!ticketId || !workspace?.id) return;
    try {
      const { data: ticketItem, error: ticketErr } = await supabase
        .from("queue_entries")
        .select("*")
        .eq("id", ticketId)
        .maybeSingle();

      if (ticketErr) throw ticketErr;
      if (ticketItem) {
        setTicketData(ticketItem);
        
        // Calculate people ahead
        const { count, error: statsErr } = await supabase
          .from("queue_entries")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspace.id)
          .eq("status", "waiting")
          .lt("joined_at", ticketItem.joined_at);

        if (!statsErr) {
          setPeopleAhead(count || 0);
        }
      }
    } catch (err: any) {
      console.error("Failed to load ticket details:", err);
    }
  };

  useEffect(() => {
    let channel: any = null;

    if (ticketId && workspace?.id) {
      fetchTicketDetails();

      // Subscribe to all changes in queue_entries for this workspace to update position in real time
      channel = supabase
        .channel("live_waiting_updates")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "queue_entries", filter: `workspace_id=eq.${workspace.id}` },
          () => {
            console.log("[QueueAI Public Join] Realtime update detected, re-fetching ticket position...");
            fetchTicketDetails();
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [ticketId, workspace?.id]);

  async function handleCheckIn() {
    if (!fullName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!workspace || !workspace.id) {
      toast.error("Workspace details are not fully loaded. Please refresh or try again.");
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
        .eq("workspace_id", workspace?.id)
        .gte("created_at", todayStart.toISOString());

      const nextTokenNumber = (dailyCount || 0) + 1;
      const token = `Q-${nextTokenNumber}`;

      // 2. Calculate estimated wait time (15 mins * count of currently waiting entries)
      const { count: waitingCount } = await supabase
        .from("queue_entries")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace?.id)
        .eq("status", "waiting");

      const estimatedWait = (waitingCount || 0) * 15;

      // 3. Insert queue entry
      const { data: newEntry, error } = await supabase
        .from("queue_entries")
        .insert({
          workspace_id: workspace?.id,
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
          workspaceId: workspace?.id,
          notify: false,
        });
      }

      toast.success("Successfully joined the queue!");
      
      // Redirect to the live waiting page
      navigate({
        to: `/join/${slug}`,
        search: { ticket: newEntry.id },
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to join queue");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLeaveQueue() {
    if (!ticketData || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("queue_entries")
        .update({ status: "exited" })
        .eq("id", ticketData.id);

      if (error) throw error;
      toast.success("You have successfully left the queue.");
      navigate({
        to: `/join/${slug}`,
        search: { ticket: undefined },
      });
      setTicketData(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to leave queue");
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

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center space-y-3 max-w-md w-full">
          <AlertCircle className="size-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold text-destructive">Database Lookup Failed</h2>
          <p className="text-muted-foreground text-sm">
            We encountered a database error while looking up the workspace.
          </p>
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-left p-3 rounded-lg text-xs font-mono max-h-40 overflow-auto">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 max-w-md w-full">
          <AlertCircle className="size-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">Workspace Not Found</h2>
          <p className="text-muted-foreground text-sm">
            We couldn't find a check-in portal for '{slug}'. Please check the URL or contact the business.
          </p>
        </div>
      </div>
    );
  }

  // Live waiting ticket screen
  if (ticketId && ticketData) {
    const isWaiting = ticketData.status === "waiting";
    const isServing = ticketData.status === "serving";
    const isCompleted = ticketData.status === "completed";
    const isExited = ticketData.status === "exited";

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md border-border/80 bg-card shadow-lg animate-fade-in">
          <CardHeader className="text-center pb-2">
            {workspace.logo_url && (
              <img src={workspace.logo_url} alt="Logo" className="mx-auto size-16 object-contain mb-3 rounded-full border bg-white" />
            )}
            <CardTitle className="text-xl font-bold tracking-tight">{workspace.name}</CardTitle>
            <p className="text-sm text-muted-foreground uppercase tracking-wider">{workspace.category} Waitlist</p>
          </CardHeader>
          <CardContent className="space-y-6 pt-4 text-center">
            {/* Status Message Badge */}
            <div className="flex justify-center">
              {isWaiting && (
                <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 animate-pulse">
                  Waiting in Line
                </Badge>
              )}
              {isServing && (
                <Badge className="bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1 font-bold">
                  You are being served!
                </Badge>
              )}
              {isCompleted && (
                <Badge className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-3 py-1 font-bold">
                  Service Completed
                </Badge>
              )}
              {isExited && (
                <Badge className="bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 font-bold">
                  Exited / Left Queue
                </Badge>
              )}
            </div>

            <div className="panel p-6 bg-accent/20 rounded-2xl relative overflow-hidden">
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Your Ticket</span>
              <h1 className="text-5xl font-display font-extrabold tracking-tight text-primary mt-2">{ticketData.token}</h1>
              <p className="text-xs text-muted-foreground mt-2 font-medium">{ticketData.customer_name}</p>
              {ticketData.service && (
                <Badge variant="outline" className="mt-1 text-[10px] uppercase font-semibold">
                  {ticketData.service}
                </Badge>
              )}
            </div>

            {isWaiting && (
              <div className="grid grid-cols-2 gap-4">
                <div className="panel p-4 bg-card text-center border">
                  <Clock className="size-4 text-primary mx-auto mb-1.5" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Estimated Wait</span>
                  <span className="text-sm font-bold mt-1 block">
                    {peopleAhead === 0 ? "Under 5 mins" : `${peopleAhead * 15} mins`}
                  </span>
                </div>
                <div className="panel p-4 bg-card text-center border">
                  <Users2 className="size-4 text-primary mx-auto mb-1.5" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Ahead of You</span>
                  <span className="text-sm font-bold mt-1 block">
                    {peopleAhead === 0 ? "You're next!" : `${peopleAhead} ${peopleAhead === 1 ? 'person' : 'people'}`}
                  </span>
                </div>
              </div>
            )}

            {isServing && (
              <div className="p-4 bg-green-500/5 text-green-600 rounded-xl border border-green-500/20 text-sm font-medium">
                Please proceed to the counter. Our staff is ready to assist you!
              </div>
            )}

            {isCompleted && (
              <div className="p-4 bg-blue-500/5 text-blue-600 rounded-xl border border-blue-500/20 text-sm font-medium">
                Thank you for visiting us today! Have a wonderful day ahead.
              </div>
            )}

            {isExited && (
              <div className="p-4 bg-red-500/5 text-red-600 rounded-xl border border-red-500/20 text-sm font-medium">
                You have left the queue waitlist.
              </div>
            )}

            <div className="space-y-2 mt-4">
              {isWaiting && (
                <Button className="w-full text-destructive hover:bg-destructive/10" variant="outline" disabled={submitting} onClick={handleLeaveQueue}>
                  Leave Queue
                </Button>
              )}
              {(isCompleted || isExited || !isWaiting && !isServing) && (
                <Button className="w-full" onClick={() => {
                  navigate({
                    to: `/join/${slug}`,
                    search: { ticket: undefined },
                  });
                  setTicketData(null);
                }}>
                  Join Waitlist Again
                </Button>
              )}
              <p className="text-[10px] text-muted-foreground pt-2">
                This page updates automatically. Please keep this screen open to track your position in line.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-border/80 bg-card shadow-lg animate-fade-in">
        <CardHeader className="text-center">
          {workspace.logo_url && (
            <img src={workspace.logo_url} alt="Logo" className="mx-auto size-16 object-contain mb-3 rounded-full border bg-white" />
          )}
          <Badge className="bg-primary/20 text-primary border-none rounded-full px-3 py-1 mx-auto mb-2">
            {workspace.category} Portal
          </Badge>
          <CardTitle className="text-xl font-bold tracking-tight">{workspace.name}</CardTitle>
          <p className="text-xs text-muted-foreground">Join our digital waitlist line. Fill out your details below.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Active Queue Statistics */}
          <div className="grid grid-cols-2 gap-3 mt-1 mb-3">
            <div className="panel p-3 bg-secondary/30 rounded-xl text-center border">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Active Queue</span>
              <span className="text-sm font-bold mt-1 block">
                {waitingCount} {waitingCount === 1 ? "person" : "people"} waiting
              </span>
            </div>
            <div className="panel p-3 bg-secondary/30 rounded-xl text-center border">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Est. Wait Time</span>
              <span className="text-sm font-bold mt-1 block">
                {waitingCount === 0 ? "Under 5 mins" : `${waitingCount * 15} mins`}
              </span>
            </div>
          </div>

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


