import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  Check,
  MessageSquareHeart,
  Shield,
  Users2,
  Workflow,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/app/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import heroImage from "@/assets/hero-dashboard.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EngageAI — One Platform. Multiple Business Automations." },
      {
        name: "description",
        content:
          "EngageAI unifies virtual queue management, event operations and feedback intelligence into one AI automation platform for modern businesses.",
      },
      { property: "og:title", content: "EngageAI — One Platform. Multiple Business Automations." },
      {
        property: "og:description",
        content: "QueueAI, EventAI and FeedbackAI on one workspace, with a shared automation engine and AI copilot.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Users2, title: "QueueAI", body: "QR-based virtual queues with AI wait prediction, exit recovery and peak-hour forecasting." },
  { icon: CalendarDays, title: "EventAI", body: "Registration forms, QR check-in, live announcements, certificates and AI event reports." },
  { icon: MessageSquareHeart, title: "FeedbackAI", body: "WhatsApp feedback collection with sentiment analysis and complaint clustering." },
  { icon: Workflow, title: "Automation engine", body: "Visual builder chaining triggers, conditions, delays and multi-channel actions." },
  { icon: Bot, title: "AI Copilot", body: "Ask anything about your workspace and get grounded, cross-module answers." },
  { icon: BarChart3, title: "Unified analytics", body: "Waiting time, attendance, sentiment and satisfaction in one performance surface." },
];

const solutions = [
  { name: "Salons & spas", body: "Cut walk-away rates with live queue positions and \"you're next\" alerts." },
  { name: "Clinics & hospitals", body: "Predict OPD rush and keep patients informed without a front-desk queue." },
  { name: "Restaurants", body: "Turn the waiting list into a WhatsApp thread that recovers lost covers." },
  { name: "Banks & service centres", body: "Token-free branch flow with SLA analytics per counter." },
  { name: "Conferences", body: "Registration to certificate, fully automated with QR check-in." },
  { name: "Retail chains", body: "Feedback and sentiment benchmarking across every location." },
];

const pricing = [
  { name: "Starter", price: "₹0", period: "/mo", desc: "For a single location getting started.", features: ["1 workspace", "1 module", "250 customers/mo", "Email support"], cta: "Start free" },
  { name: "Growth", price: "₹4,999", period: "/mo", desc: "For growing multi-module teams.", features: ["3 workspaces", "All modules", "10,000 customers/mo", "WhatsApp automation", "AI Copilot"], cta: "Start 14-day trial", featured: true },
  { name: "Enterprise", price: "Custom", period: "", desc: "For chains and large operations.", features: ["Unlimited workspaces", "SSO & RBAC", "Dedicated success manager", "Custom AI models", "99.9% SLA"], cta: "Talk to sales" },
];

const testimonials = [
  { quote: "Queue walk-aways dropped 38% in the first month. The 'you're next' automation alone paid for the platform.", name: "Priya Menon", role: "COO, Salon Spa Hub" },
  { quote: "We ran a 600-person summit with two staff on check-in. Certificates went out before attendees reached the car park.", name: "Rahul Bhatt", role: "Head of Events, TechSummit" },
  { quote: "The AI summaries surface complaint patterns our monthly reports used to miss entirely.", name: "Dr. Anita Shah", role: "Director, Metro Clinics" },
];

const stats = [
  { value: "2.4M+", label: "Customers processed" },
  { value: "38%", label: "Fewer queue walk-aways" },
  { value: "64%", label: "Feedback response rate" },
  { value: "99.9%", label: "Platform uptime" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border glass">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Logo />
          <nav className="ml-4 hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">Platform</a>
            <a href="#solutions" className="transition-colors hover:text-foreground">Solutions</a>
            <a href="#pricing" className="transition-colors hover:text-foreground">Pricing</a>
            <a href="#customers" className="transition-colors hover:text-foreground">Customers</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-30" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-20 text-center sm:px-6 sm:pt-28">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1.5">
              <Zap className="size-3 text-primary" /> Now with cross-module AI Copilot
            </Badge>
            <h1 className="mx-auto max-w-4xl font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
              One platform.
              <br />
              <span className="text-gradient">Multiple business automations.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
              EngageAI runs your queues, events and customer feedback on a single AI workspace —
              with WhatsApp automation, predictive insights and analytics built in.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/auth">
                <Button size="lg" className="gap-2">
                  Start free <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link to="/app/dashboard">
                <Button size="lg" variant="outline">View live demo</Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-16"
          >
            <img
              src={heroImage}
              alt="EngageAI workspace dashboard showing queue, event and feedback analytics"
              width={1600}
              height={1008}
              className="mx-auto w-full max-w-5xl rounded-2xl border border-border shadow-[var(--shadow-glow)]"
            />
          </motion.div>
        </div>
      </section>

      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-3xl font-semibold tracking-tight">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Every automation your business needs, on one workspace
          </h2>
          <p className="mt-4 text-muted-foreground">
            Shared authentication, notifications, automation engine and AI copilot — so each module
            makes the others smarter.
          </p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
              className="panel p-6"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-accent text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="solutions" className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for businesses where waiting, showing up and feedback decide revenue
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {solutions.map((s) => (
              <div key={s.name} className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-display text-base font-semibold">{s.name}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Pricing that scales with your locations
          </h2>
          <p className="mt-3 text-muted-foreground">No per-seat surprises. Every plan includes the AI copilot.</p>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {pricing.map((p) => (
            <div
              key={p.name}
              className={`panel flex flex-col p-7 ${p.featured ? "border-primary/50 shadow-[var(--shadow-glow)]" : ""}`}
            >
              {p.featured && <Badge className="mb-3 w-fit">Most popular</Badge>}
              <h3 className="font-display text-lg font-semibold">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              <p className="mt-5 font-display text-4xl font-semibold tracking-tight">
                {p.price}
                <span className="text-base font-normal text-muted-foreground">{p.period}</span>
              </p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-muted-foreground">
                    <Check className="size-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="mt-8">
                <Button className="w-full" variant={p.featured ? "default" : "outline"}>{p.cta}</Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section id="customers" className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Teams running thousands of customers a day
          </h2>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="rounded-xl border border-border bg-card p-7">
                <blockquote className="text-sm leading-relaxed">"{t.quote}"</blockquote>
                <figcaption className="mt-5 text-sm">
                  <span className="font-medium">{t.name}</span>
                  <span className="block text-muted-foreground">{t.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <div className="panel relative overflow-hidden px-8 py-16 text-center">
          <div className="pointer-events-none absolute inset-0 hero-glow" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Replace three tools with one AI workspace
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Set up your first queue, event or feedback flow in under ten minutes.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/auth">
                <Button size="lg" className="gap-2">Get started free <ArrowRight className="size-4" /></Button>
              </Link>
              <Link to="/app/dashboard">
                <Button size="lg" variant="outline">Explore the product</Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Shield className="size-3.5" /> Workspace isolation & RBAC</span>
              <span className="flex items-center gap-1.5"><Bell className="size-3.5" /> Realtime notifications</span>
              <span className="flex items-center gap-1.5"><Zap className="size-3.5" /> WhatsApp automation</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
          <Logo />
          <p className="text-sm text-muted-foreground sm:ml-6">
            One Platform. Multiple Business Automations.
          </p>
          <p className="text-xs text-muted-foreground sm:ml-auto">
            © {new Date().getFullYear()} EngageAI
          </p>
        </div>
      </footer>
    </div>
  );
}
