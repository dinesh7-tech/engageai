import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Users2, CalendarDays, MessageSquareHeart } from "lucide-react";

export const Route = createFileRoute("/public/$slug")({
  component: PublicBusinessPortal,
});

function PublicBusinessPortal() {
  const { slug } = Route.useParams();
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  async function handleActionSubmit(actionType: string) {
    if (!fullName.trim() || !phoneNumber.trim()) {
      toast.error("Please enter your name and phone number");
      return;
    }
    setSubmitting(true);
    try {
      if (actionType === "queue") {
        const { error } = await supabase.from("queue_entries").insert({
          workspace_id: workspace.id,
          customer_name: fullName.trim(),
          customer_phone: phoneNumber.trim(),
          status: "waiting",
        });
        if (error) throw error;
        toast.success("Successfully joined the waiting list!");
      } else {
        toast.success("Registration success!");
      }
      setFullName("");
      setPhoneNumber("");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground text-sm">Workspace '{slug}' was not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-border/80 bg-card">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold tracking-tight">{workspace.name}</CardTitle>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{workspace.category} Portal</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Your Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input
              placeholder="Phone Number (e.g. +1234567890)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          {workspace.category === "Events" ? (
            <Button
              className="w-full gap-2"
              disabled={submitting}
              onClick={() => handleActionSubmit("event")}
            >
              <CalendarDays className="size-4" /> Register & Check-In
            </Button>
          ) : (
            <Button
              className="w-full gap-2"
              disabled={submitting}
              onClick={() => handleActionSubmit("queue")}
            >
              <Users2 className="size-4" /> Join Waitlist Queue
            </Button>
          )}

          <p className="text-[10px] text-center text-muted-foreground mt-4">
            Powered by EngageAI Business OS. No spam. Realtime wait notifications sent over SMS/WhatsApp.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
