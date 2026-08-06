import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { CornerDownLeft, Loader2, Sparkles, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/copilot")({
  head: () => ({
    meta: [
      { title: "AI Copilot — Ask EngageAI" },
      { name: "description", content: "Ask questions about queues, events, feedback and automations in plain language." },
    ],
  }),
  component: CopilotPage,
});

interface Msg {
  id: number;
  role: "user" | "assistant";
  text: string;
}

const copilotSuggestions = [
  "How many users left the queue today?",
  "Show pending feedback.",
  "Which event received the highest rating?",
  "Summarize customer complaints.",
];

function CopilotPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  function send(text: string) {
    if (!text.trim() || thinking) return;
    const id = Date.now();
    setMessages((m) => [...m, { id, role: "user", text }]);
    setInput("");
    setThinking(true);
    window.setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: id + 1,
          role: "assistant",
          text: `I've analyzed the live workspace parameters. At the moment, there are no significant abnormalities or customer logs recorded to compute an outlier for "${text}". Add customers to the modules to compile live analytics.`,
        },
      ]);
      setThinking(false);
    }, 800);
  }

  return (
    <>
      <PageHeader
        title="AI Copilot"
        description="Ask EngageAI anything about your workspace. Answers are grounded in live module data."
      />

      <div className="panel flex min-h-[60vh] flex-col overflow-hidden">
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {messages.length === 0 && !thinking && (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-16 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-[image:var(--gradient-primary)]">
                <Wand2 className="size-6 text-primary-foreground" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold">Ask EngageAI</h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Cross-module intelligence over queues, events, feedback and automations.
                </p>
              </div>
              <div className="mt-2 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                {copilotSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-xl border border-border bg-secondary/50 px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    <Sparkles className="mb-1.5 size-3.5 text-primary" />
                    <span className="block">{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-2xl text-sm leading-relaxed",
                  m.role === "user"
                    ? "rounded-2xl bg-primary px-4 py-2.5 text-primary-foreground"
                    : "text-foreground",
                )}
              >
                {m.text}
              </div>
            </motion.div>
          ))}

          {thinking && (
            <p className="animate-pulse text-sm text-muted-foreground">Thinking…</p>
          )}
        </div>

        <form
          className="flex gap-2 border-t border-border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about queues, events, feedback or automations…"
            className="h-11"
          />
          <Button type="submit" className="h-11 px-4" disabled={thinking}>
            {thinking ? <Loader2 className="size-4 animate-spin" /> : <CornerDownLeft className="size-4" />}
          </Button>
        </form>
      </div>
    </>
  );
}
