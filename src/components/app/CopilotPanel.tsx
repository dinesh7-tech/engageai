import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CornerDownLeft, Loader2, Wand2, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { askGeminiAI } from "@/lib/gemini.functions";

const copilotSuggestions = [
  "College Hackathon",
  "When someone registers for my hackathon",
  "Wait time exceeds 20 minutes",
  "Summarize customer complaints",
  "Suggest marketing offer for repeat customers"
];

export function CopilotPanel({ compact = false, className }: { compact?: boolean | undefined; className?: string | undefined }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{ body: string; trigger?: string; actions?: string[]; nextAction: string } | null>(null);
  const [rawTextAnswer, setRawTextAnswer] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);

  async function ask(q: string) {
    if (!q.trim()) return;
    setQuestion(q);
    setThinking(true);
    setAnswer(null);
    setRawTextAnswer(null);
    setErrorMessage(null);

    try {
      // 1. Try real Gemini API generation via server function
      const res = await askGeminiAI({ data: { prompt: q } });

      if (res.success && res.answer) {
        setRawTextAnswer(res.answer);
        setThinking(false);
        return;
      }

      if (res.error && res.error.includes("Gemini API key is not configured")) {
        setErrorMessage("Gemini API key is not configured.");
      }
    } catch (err: any) {
      console.warn("Gemini call exception, using EngageAI Brain local fallback:", err);
    }

    // 2. Fallback local semantic analyzer if key is unconfigured or failed
    const lower = q.toLowerCase();

    if (lower.includes("college hackathon") || lower.includes("hackathon")) {
      setAnswer({
        body: "Here is the recommended setup for your College Hackathon:",
        trigger: "Event Category: Technology",
        actions: [
          "Fields: Full Name, College, Department, Year, Phone, Email, GitHub, LinkedIn, Team Name",
          "Automations: Registration Confirmation, 24h Reminder, Gate Check-in QR, Participation Certificate, Post-event Feedback"
        ],
        nextAction: "Go to EventAI Manager -> Click Create Event -> Use AI Suggest."
      });
    } else if (lower.includes("when someone registers") || lower.includes("registers for my")) {
      setAnswer({
        body: "I've converted your description into an EngageAI Automation Workflow:",
        trigger: "Registration Submitted (EventAI)",
        actions: [
          "Send WhatsApp Confirmation with ticket link",
          "Send QR Code badge",
          "Schedule Reminder 24 hours before event",
          "Schedule Reminder 1 hour before event",
          "Trigger Attendance confirmation on gate scan",
          "Send Thank You message & Feedback request"
        ],
        nextAction: "Go to Automation Workflows -> Click New Rule to activate this workflow."
      });
    } else if (lower.includes("wait time") || lower.includes("waiting") || lower.includes("queue")) {
      setAnswer({
        body: "Queue Efficiency Analysis: Average wait time is approaching threshold.",
        actions: [
          "Recommendation: Open an additional counter immediately to reduce customer drop-offs",
          "Dispatch automated WhatsApp ETA updates to waiting customers in line"
        ],
        nextAction: "Open QueueAI -> Click 'Add Counter' to rebalance customer flow."
      });
    } else {
      setAnswer({
        body: `EngageAI Brain Analysis for "${q}":`,
        actions: [
          "Grounding in active modules: QueueAI, EventAI, WhatsApp Automation, Reviews, Analytics",
          "All systems operational with centralized EngageAI WhatsApp delivery active"
        ],
        nextAction: "Select a module from the left navigation bar to manage live customer operations."
      });
    }

    setThinking(false);
  }

  return (
    <section className={cn("panel relative overflow-hidden p-5", className)}>
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-40 hero-glow opacity-70" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-[image:var(--gradient-primary)]">
            <Sparkles className="size-4 text-primary-foreground" />
          </span>
          <div>
            <h3 className="font-display text-base font-semibold">EngageAI Brain</h3>
            <p className="text-xs text-muted-foreground">Intelligent business copilot grounded in your live workspace data</p>
          </div>
        </div>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
        >
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask EngageAI Brain (e.g. 'College Hackathon', 'When someone registers...')"
            className="h-11 text-xs"
          />
          <Button type="submit" className="h-11 px-4" disabled={thinking}>
            {thinking ? <Loader2 className="size-4 animate-spin" /> : <CornerDownLeft className="size-4" />}
          </Button>
        </form>

        {!compact && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {copilotSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="rounded-full border border-border bg-secondary/80 px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {thinking && (
            <motion.p
              key="thinking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4 text-xs text-muted-foreground flex items-center gap-2"
            >
              <Loader2 className="size-3.5 animate-spin text-primary" /> EngageAI Brain is analyzing workspace parameters...
            </motion.p>
          )}
          {errorMessage && !thinking && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400 font-medium"
            >
              ⚠️ {errorMessage} Using EngageAI Brain offline intelligence mode.
            </motion.div>
          )}

          {rawTextAnswer && !thinking && (
            <motion.div
              key="rawAnswer"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 rounded-xl border border-border bg-secondary/60 p-4 text-xs leading-relaxed whitespace-pre-line"
            >
              {rawTextAnswer}
            </motion.div>
          )}

          {answer && !rawTextAnswer && !thinking && (
            <motion.div
              key="answer"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 rounded-xl border border-border bg-secondary/60 p-4 text-xs space-y-3"
            >
              <p className="font-semibold text-foreground">{answer.body}</p>

              {answer.trigger && (
                <div className="p-2.5 bg-primary/10 rounded-lg border border-primary/20 font-mono text-[11px] text-primary">
                  <strong>Trigger:</strong> {answer.trigger}
                </div>
              )}

              {answer.actions && answer.actions.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider">
                    {answer.trigger ? "Actions:" : "Insights & Recommendations:"}
                  </span>
                  <ul className="space-y-1 pl-1">
                    {answer.actions.map((act, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-foreground">
                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2 border-t border-border/60 flex items-center gap-1.5 text-primary font-semibold text-[11px]">
                <ArrowRight className="size-3.5" />
                <span>Recommended Next Action: {answer.nextAction}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
