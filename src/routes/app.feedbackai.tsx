import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Frown, MessageSquarePlus, Send, Smile, ThumbsUp, Plus, Sparkles } from "lucide-react";
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
import { analyzeEventFeedbackAI } from "@/lib/feedback.functions";

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

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    if (!workspaceId) return;
    const { data } = await supabase
      .from("feedback_campaigns")
      .select("*, events(name)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      setCampaigns(data);
      if (!selectedCampaign) {
        setSelectedCampaign(data[0]);
        loadAiAnalysis(data[0].id);
      }
    }
  };

  const loadAiAnalysis = async (campaignId: string) => {
    setAiLoading(true);
    try {
      const res = await analyzeEventFeedbackAI({ data: { campaignId } });
      setAiAnalysis(res);
    } catch (e) {
      console.warn("AI Analysis load warning:", e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAskEngageAI = async () => {
    if (!aiQuery.trim() || !selectedCampaign) return;
    setAiLoading(true);
    try {
      const res = await analyzeEventFeedbackAI({ data: { campaignId: selectedCampaign.id, query: aiQuery.trim() } });
      setAiAnswer(res.answer || "No response generated.");
    } catch (e: any) {
      toast.error(e.message || "AI Query failed");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
    fetchCampaigns();
  }, [workspaceId]);

  const list = feedbackList.filter((f) => filter === "All" || f.sentiment === filter);
  const totalRating = feedbackList.reduce((acc, f) => acc + (f.rating || 0), 0);
  const avgRating = feedbackList.length > 0 ? (totalRating / feedbackList.length).toFixed(1) : "0.0";
  const pendingCount = feedbackList.filter(f => f.status === "pending").length;

  return (
    <>
      <PageHeader
        title="FeedbackAI Engine"
        description="Automated post-event feedback campaigns, Gemini AI sentiment analysis, NPS scoring, and attendee feedback workflows."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={requestFeedback}>Send Broadcast</Button>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 bg-primary text-white">
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
          { label: "Total Campaigns", value: String(campaigns.length), icon: ThumbsUp as any, hint: "event campaigns" },
          { label: "Responses Collected", value: String(feedbackList.length + (selectedCampaign?.total_responses || 0)), hint: "all time", icon: Smile as any },
          { label: "Net Promoter Score", value: "82 NPS", icon: Sparkles as any, hint: "promoter ratio" },
          { label: "Average Event Rating", value: `${selectedCampaign?.average_rating || avgRating} / 5`, icon: StarIcon as any, hint: "average rating" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <StatCard label={s.label} value={s.value} icon={s.icon} hint={s.hint} />
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="campaigns" className="mt-6">
        <TabsList className="bg-secondary/40 border p-1 rounded-xl">
          <TabsTrigger value="campaigns" className="text-xs">Event Campaigns ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="ai-analysis" className="text-xs">Gemini AI Executive Analysis</TabsTrigger>
          <TabsTrigger value="all-logs" className="text-xs">Individual Feedback Logs</TabsTrigger>
        </TabsList>

        {/* TAB 1: CAMPAIGNS */}
        <TabsContent value="campaigns" className="mt-4 space-y-4">
          {campaigns.length === 0 ? (
            <EmptyState icon={MessageSquarePlus} title="No event feedback campaigns" description="End an event in EventAI to automatically launch a FeedbackAI campaign." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {campaigns.map((c) => (
                <div
                  key={c.id}
                  onClick={() => { setSelectedCampaign(c); loadAiAnalysis(c.id); }}
                  className={`panel p-5 rounded-2xl border cursor-pointer transition-all ${
                    selectedCampaign?.id === c.id ? "border-primary/60 bg-primary/5 shadow-md" : "border-border/60 hover:bg-secondary/40"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{c.name}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">Linked Event: {c.events?.name || "Event"}</p>
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] uppercase">
                      {c.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/40 text-center">
                    <div className="bg-secondary/20 p-2 rounded-lg">
                      <span className="block font-bold text-sm text-foreground">{c.total_sent || 0}</span>
                      <span className="text-[9px] text-muted-foreground uppercase">Total Sent</span>
                    </div>
                    <div className="bg-secondary/20 p-2 rounded-lg">
                      <span className="block font-bold text-sm text-emerald-400">{c.total_responses || 0}</span>
                      <span className="text-[9px] text-muted-foreground uppercase">Responses</span>
                    </div>
                    <div className="bg-secondary/20 p-2 rounded-lg">
                      <span className="block font-bold text-sm text-amber-400">{c.average_rating || "5.0"} ★</span>
                      <span className="text-[9px] text-muted-foreground uppercase">Avg Rating</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: AI EXECUTIVE ANALYSIS */}
        <TabsContent value="ai-analysis" className="mt-4 space-y-4">
          {selectedCampaign ? (
            <div className="space-y-4">
              <div className="panel p-5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                    <Sparkles className="size-4 text-amber-400" />
                    <span>Gemini AI Insights — {selectedCampaign.name}</span>
                  </div>
                  <Badge variant="outline" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px]">
                    Auto Generated
                  </Badge>
                </div>

                {aiAnalysis && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs">
                    <div className="panel p-3.5 bg-background/50 rounded-xl space-y-2">
                      <span className="text-[10px] text-emerald-400 uppercase font-bold block">Top Positive Highlights</span>
                      <ul className="list-disc list-inside text-zinc-300 space-y-1">
                        {aiAnalysis.topPositives?.map((p: string, i: number) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>
                    <div className="panel p-3.5 bg-background/50 rounded-xl space-y-2">
                      <span className="text-[10px] text-rose-400 uppercase font-bold block">Priority Improvements</span>
                      <ul className="list-disc list-inside text-zinc-300 space-y-1">
                        {aiAnalysis.priorityImprovements?.map((p: string, i: number) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Ask EngageAI Q&A */}
              <div className="panel p-4 rounded-2xl border border-border/80 bg-secondary/10 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ask EngageAI Event Assistant</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask 'What did attendees like?' or 'What are top complaints?'"
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAskEngageAI(); }}
                    className="text-xs"
                  />
                  <Button onClick={handleAskEngageAI} disabled={aiLoading} className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                    {aiLoading ? <Send className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />} Ask AI
                  </Button>
                </div>

                {aiAnswer && (
                  <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-zinc-200 leading-relaxed">
                    <span className="font-bold text-indigo-300 block mb-1">Answer:</span>
                    {aiAnswer}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground panel">Select a campaign above to view AI insights.</div>
          )}
        </TabsContent>

        {/* TAB 3: ALL LOGS */}
        <TabsContent value="all-logs" className="mt-4">
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
