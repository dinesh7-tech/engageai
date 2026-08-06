import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, MessageSquareHeart, Users2, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/modules")({
  head: () => ({
    meta: [
      { title: "Modules — EngageAI" },
      { name: "description", content: "Enable QueueAI, EventAI and FeedbackAI modules on a shared EngageAI workspace." },
    ],
  }),
  component: ModulesPage,
});

const modulesList = [
  {
    id: "queueai",
    name: "QueueAI",
    to: "/app/queueai" as const,
    tagline: "Virtual queue management with AI wait prediction",
    status: "Active",
  },
  {
    id: "eventai",
    name: "EventAI",
    to: "/app/eventai" as const,
    tagline: "Registrations, QR check-in and live event automation",
    status: "Active",
  },
  {
    id: "feedbackai",
    name: "FeedbackAI",
    to: "/app/feedbackai" as const,
    tagline: "Feedback collection with sentiment intelligence",
    status: "Active",
  },
];

const icons = { queueai: Users2, eventai: CalendarDays, feedbackai: MessageSquareHeart } as const;

const highlights: Record<string, string[]> = {
  queueai: ["QR join", "Live position", "AI wait prediction", "Exit recovery", "Peak-hour forecast"],
  eventai: ["Form builder", "QR check-in", "Live announcements", "Certificates", "AI reports"],
  feedbackai: ["WhatsApp requests", "Sentiment analysis", "Complaint clusters", "AI summaries", "CSAT reports"],
};

const upcoming = [
  { name: "BookingAI", tagline: "Appointment scheduling with AI slot optimisation" },
  { name: "SupportAI", tagline: "Ticket triage and resolution assistance" },
];

function ModulesPage() {
  return (
    <>
      <PageHeader
        title="Modules"
        description="One login, one workspace, multiple automations. Every module shares auth, notifications, the automation engine and the AI copilot."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {modulesList.map((m) => {
          const Icon = icons[m.id as keyof typeof icons];
          return (
            <div key={m.id} className="panel flex flex-col p-6">
              <div className="flex items-start justify-between">
                <span className="grid size-11 place-items-center rounded-xl bg-[image:var(--gradient-primary)]">
                  <Icon className="size-5 text-primary-foreground" />
                </span>
                <Badge className="bg-success/15 text-success">{m.status}</Badge>
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold">{m.name}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{m.tagline}</p>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {highlights[m.id]!.map((h) => (
                  <li key={h} className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                    {h}
                  </li>
                ))}
              </ul>
              <Link to={m.to} className="mt-6">
                <Button className="w-full gap-2">
                  Open {m.name} <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 md:grid-cols-2 mt-6">
        {upcoming.map((u) => (
          <div key={u.name} className="panel flex items-center gap-4 border-dashed p-6">
            <span className="grid size-11 place-items-center rounded-xl bg-accent text-primary">
              <Sparkles className="size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-base font-semibold">{u.name}</h3>
              <p className="text-sm text-muted-foreground">{u.tagline}</p>
            </div>
            <Badge variant="secondary" className="ml-auto shrink-0">Coming soon</Badge>
          </div>
        ))}
      </div>
    </>
  );
}
