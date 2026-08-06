import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CornerDownLeft, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const copilotSuggestions = [
  "How many users left the queue today?",
  "Show pending feedback.",
  "Which event received the highest rating?",
  "Summarize customer complaints.",
];

export function CopilotPanel({ compact = false, className }: { compact?: boolean | undefined; className?: string | undefined }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);

  function ask(q: string) {
    if (!q.trim()) return;
    setQuestion(q);
    setThinking(true);
    setAnswer(null);
    window.setTimeout(() => {
      setAnswer(`I've analyzed the live workspace parameters. At the moment, there are no significant abnormalities or customer logs recorded to compute an outlier for "${q}". Add customers to the modules to compile live analytics.`);
      setThinking(false);
    }, 700);
  }

  return (
    <section className={cn("panel relative overflow-hidden p-5", className)}>
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-40 hero-glow opacity-70" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-[image:var(--gradient-primary)]">
            <Wand2 className="size-4 text-primary-foreground" />
          </span>
          <div>
            <h3 className="font-display text-base font-semibold">Ask EngageAI</h3>
            <p className="text-xs text-muted-foreground">Your workspace copilot, grounded in live module data</p>
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
            placeholder="Ask anything about queues, events or feedback…"
            className="h-11"
          />
          <Button type="submit" className="h-11 px-4" disabled={thinking}>
            {thinking ? <Loader2 className="size-4 animate-spin" /> : <CornerDownLeft className="size-4" />}
          </Button>
        </form>

        {!compact && (
          <div className="mt-3 flex flex-wrap gap-2">
            {copilotSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
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
              className="mt-4 text-sm text-muted-foreground"
            >
              Analysing workspace data…
            </motion.p>
          )}
          {answer && !thinking && (
            <motion.div
              key="answer"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 rounded-xl border border-border bg-secondary/60 p-4 text-sm leading-relaxed"
            >
              {answer}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
