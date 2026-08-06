import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Frown, MessageSquarePlus, Send, Smile, ThumbsUp, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { ChartCard } from "@/components/app/ChartCard";
import { CopilotPanel } from "@/components/app/CopilotPanel";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { dispatchWhatsApp } from "@/lib/whatsapp-client";
import { emitActivity, emitNotification } from "@/lib/realtime.functions";

export const Route = createFileRoute("/app/feedbackai")({
  head: () => ({
    meta: [
      { title: "FeedbackAI — Customer Feedback Automation | EngageAI" },
      { name: "description", content: "Collect feedback over WhatsApp, analyze sentiment, and automatically resolve responses." },
    ],
  }),
  component: FeedbackAIPage,
});

interface FeedbackItem {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  channel: string;
  rating: number | null;
  sentiment: string;
  category: string | null;
  text: string | null;
  status: string;
  created_at: string;
}

function FeedbackAIPage() {
  const { activeWorkspace } = useActiveWorkspace();
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [filter, setFilter] = useState<"All" | "positive" | "neutral" | "negative">("All");
  const [loading, setLoading] = useState(true);

  // Form modals
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState("Service");
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);

  const workspaceId = activeWorkspace?.id;
  const businessName = activeWorkspace?.name || "Our Business";

  const fetchFeedback = async () => {
    if (!workspaceId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("feedback_entries")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch feedback logs");
    } else {
      setFeedbackList((data || []) as FeedbackItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFeedback();
  }, [workspaceId]);

  async function handleAddFeedback() {
    if (!custName.trim() || !workspaceId) return;

    // Local naive sentiment analyzer
    let sentiment: "positive" | "neutral" | "negative" = "neutral";
    if (rating >= 4) sentiment = "positive";
    else if (rating <= 2) sentiment = "negative";

    const { error } = await supabase.from("feedback_entries").insert({
      workspace_id: workspaceId,
      customer_name: custName.trim(),
      customer_phone: custPhone.trim() || null,
      channel: "Manual Form",
      rating,
      sentiment,
      category,
      text: comment.trim() || null,
      status: "pending",
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Feedback log created successfully");
      setCustName("");
      setCustPhone("");
      setComment("");
      setOpen(false);
      fetchFeedback();
      void emitActivity({ data: { actor: "FeedbackAI", text: `New ${sentiment} rating log recorded for ${custName.trim()}` } });
    }
  }

  async function requestFeedback() {
    if (!workspaceId || feedbackList.length === 0) {
      toast.info("No logs present to broadcast queue pings to.");
      return;
    }
    for (const person of feedbackList) {
      if (person.customer_phone) {
        await dispatchWhatsApp({
          to: person.customer_phone,
          recipient: person.customer_name,
          templateId: "feedback_request",
          variables: { name: person.customer_name, business: businessName, link: `https://engageai.app/f/${person.id}` },
          notify: false,
        });
      }
    }
    toast.success(`Feedback request sent to ${feedbackList.length} customers over WhatsApp`);
  }

  async function resolveFeedback(id: string, name: string) {
    const { error } = await supabase
      .from("feedback_entries")
      .update({ status: "resolved" })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Feedback log for ${name} resolved`);
      fetchFeedback();
      void emitNotification({ data: { title: "Feedback resolved", body: `${name}'s log has been followed up and closed.`, severity: "success" } });
    }
  }

  const list = feedbackList.filter((f) => filter === "All" || f.sentiment === filter);
  const totalRating = feedbackList.reduce((acc, f) => acc + (f.rating || 0), 0);
  const avgRating = feedbackList.length > 0 ? (totalRating / feedbackList.length).toFixed(1) : "0.0";
  const pendingCount = feedbackList.filter(f => f.status === "pending").length;

  return (
    <>
      <PageHeader
        title="FeedbackAI"
        description="Collect feedback, analyze customer sentiment, and escalate detractor responses automatically."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={requestFeedback}>Send requests</Button>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="size-4" /> Add Feedback Log
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Log Feedback</DialogTitle>
                  <DialogDescription>Submit customer response manually.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="fb-name">Customer Name</Label>
                    <Input id="fb-name" value={custName} onChange={e => setCustName(e.target.value)} placeholder="Jane Doe" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="fb-phone">Phone (WhatsApp)</Label>
                    <Input id="fb-phone" value={custPhone} onChange={e => setCustPhone(e.target.value)} placeholder="+91XXXXXXXXXX" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="fb-rating">Rating (1-5)</Label>
                    <Input id="fb-rating" type="number" min={1} max={5} value={rating} onChange={e => setRating(Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="fb-cat">Category</Label>
                    <Input id="fb-cat" value={category} onChange={e => setCategory(e.target.value)} placeholder="Service, Waiting time, Pricing..." />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="fb-comment">Review text</Label>
                    <Textarea id="fb-comment" value={comment} onChange={e => setComment(e.target.value)} placeholder="Excellent experience..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddFeedback} className="w-full">Save log</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Feedback received", value: String(feedbackList.length), icon: ThumbsUp, hint: "responses" },
          { label: "Pending followups", value: String(pendingCount), hint: "requires action", icon: Frown },
          { label: "Sentiment score", value: feedbackList.length > 0 ? `${((feedbackList.filter(f => f.sentiment === "positive").length / feedbackList.length) * 100).toFixed(0)}%` : "0%", icon: Smile, hint: "positive ratio" },
          { label: "Average rating", value: `${avgRating} / 5`, icon: StarIcon, hint: "customer score" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="all" className="mt-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all" onClick={() => setFilter("All")}>All logs</TabsTrigger>
            <TabsTrigger value="positive" onClick={() => setFilter("positive")}>Positive</TabsTrigger>
            <TabsTrigger value="neutral" onClick={() => setFilter("neutral")}>Neutral</TabsTrigger>
            <TabsTrigger value="negative" onClick={() => setFilter("negative")}>Negative</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="mt-6">
          <div className="space-y-4">
            {list.length === 0 ? (
              <EmptyState icon={MessageSquarePlus} title="No feedback logged" description="Add feedback records or request reviews over WhatsApp." />
            ) : (
              list.map((item) => (
                <div key={item.id} className="panel p-5 flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{item.customer_name}</span>
                      <Badge variant="outline">{item.category || "General"}</Badge>
                      <Badge variant={item.sentiment === "positive" ? "default" : item.sentiment === "negative" ? "destructive" : "secondary"}>
                        {item.sentiment}
                      </Badge>
                    </div>
                    {item.text && <p className="text-sm text-muted-foreground">{item.text}</p>}
                    <p className="text-[10px] text-muted-foreground">Logged via {item.channel} · {new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-amber-500">{"★".repeat(item.rating || 0)}</span>
                    {item.status === "pending" && (
                      <Button size="sm" onClick={() => resolveFeedback(item.id, item.customer_name)}>Resolve</Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

function StarIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
