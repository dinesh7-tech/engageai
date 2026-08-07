import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform, useReducedMotion, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import {
  Sparkles,
  ArrowRight,
  CalendarDays,
  BarChart3,
  Users2,
  Workflow,
  Bot,
  MessageSquareHeart,
  ChevronDown,
  Plus,
  Check,
  ShieldCheck,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { FadeUp, Stagger, Magnetic } from "@/components/motion/primitives";
import heroDashboard from "@/assets/hero-dashboard.jpeg";

import heroVideo from "@/assets/hero-loop.mp4";

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
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-white/20 selection:text-white">
      <LandingNav />
      <Hero />
      <LogoStrip />
      <FeatureShowcase />
      <ProductScroll />
      <TestimonialSection />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}

function LandingNav() {
  return (
    <header className="fixed top-4 left-1/2 z-50 w-[min(96%,1120px)] -translate-x-1/2">
      <div className="glass-strong shadow-float flex h-14 items-center justify-between rounded-2xl px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="grid size-7 place-items-center rounded-lg bg-white text-black">
            <Sparkles className="size-4" />
          </div>
          <span className="font-display text-[15px] font-semibold tracking-tight text-white">EngageAI</span>
        </Link>
        <nav className="hidden items-center gap-7 text-[13px] text-white/60 md:flex">
          <a href="#features" className="transition-colors hover:text-white">Platform</a>
          <a href="#product" className="transition-colors hover:text-white">Showcase</a>
          <a href="#pricing" className="transition-colors hover:text-white">Pricing</a>
          <a href="#faq" className="transition-colors hover:text-white">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="rounded-xl text-white/80 hover:bg-white/[0.06] hover:text-white">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Magnetic>
            <Button asChild size="sm" className="rounded-xl bg-white text-black hover:bg-white/90">
              <Link to="/auth">
                Get started
              </Link>
            </Button>
          </Magnetic>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const reduce = useReducedMotion();
  return (
    <section className="relative isolate min-h-[100dvh] overflow-hidden">
      {/* Background video */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <video
          src={heroVideo}
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-background" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </div>


      <div className="relative mx-auto flex min-h-[100dvh] max-w-[1120px] flex-col items-center justify-center px-6 pb-24 pt-32 text-center">
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 30, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.1, ease: [0.25, 1, 0.5, 1] }}
          className="font-display max-w-4xl text-balance text-[54px] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-[80px]"
        >
          One platform.
          <br />
          <span className="text-gradient">Multiple business automations.</span>
        </motion.h1>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.25, 1, 0.5, 1] }}
          className="mt-7 max-w-xl text-pretty text-[17px] leading-relaxed text-white/65"
        >
          EngageAI unifies virtual queue management, event operations, and customer feedback intelligence into a single, high-performance AI workspace.
        </motion.p>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35, ease: [0.25, 1, 0.5, 1] }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Magnetic>
            <Button asChild size="lg" className="h-12 rounded-full bg-white px-8 text-[15px] font-medium text-black hover:bg-white/90">
              <Link to="/auth">
                Start free <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </Magnetic>
          <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-white/15 bg-white/[0.03] px-8 text-[15px] text-white hover:bg-white/[0.08]">
            <Link to="/app/dashboard">View Live Demo</Link>
          </Button>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-16 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/40"
        >
          <span>Scroll to explore</span>
          <ChevronDown className="size-3 animate-bounce" />
        </motion.div>
      </div>
    </section>
  );
}

function LogoStrip() {
  const logos = ["Salon Spa Hub", "TechSummit 2026", "Metro Clinics", "Apollo Hospital", "Ramesh Travels", "Sai Teja Enterprises"];
  return (
    <section className="border-t border-white/[0.05] py-14">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-center text-[11px] font-medium uppercase tracking-[0.24em] text-white/40">
          Trusted by top business operations & event teams
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {logos.map((l) => (
            <span
              key={l}
              className="font-display text-xl font-semibold tracking-tight text-white/40 transition-colors hover:text-white/80"
            >
              {l}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureShowcase() {
  const items = [
    { icon: Users2, title: "QueueAI Virtual Line", desc: "QR check-in, AI wait time prediction, exit recovery, and peak-hour forecasting." },
    { icon: CalendarDays, title: "EventAI Operations", desc: "Dynamic registration forms, QR ticket scanner, live announcements, and automated PDF certificates." },
    { icon: MessageSquareHeart, title: "FeedbackAI Intelligence", desc: "Automated WhatsApp feedback collection with sentiment analysis and complaint clustering." },
    { icon: Workflow, title: "Automation Engine", desc: "Visual multi-step engine connecting WhatsApp triggers, delays, and condition nodes." },
    { icon: Bot, title: "Grounded AI Copilot", desc: "Ask anything about your workspace data and receive grounded cross-module responses." },
    { icon: BarChart3, title: "Unified Analytics", desc: "Real-time metrics, queue velocity, sentiment distribution, and performance reports." },
  ];
  return (
    <section id="features" className="relative py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <FadeUp className="max-w-2xl">
          <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/50">Modules</div>
          <h2 className="font-display mt-3 text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-6xl text-white">
            Designed for high-impact
            <br />
            <span className="text-gradient">customer engagement.</span>
          </h2>
        </FadeUp>

        <Stagger className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((f) => (
            <FadeUp
              key={f.title}
              className="hover-lift group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[color:var(--color-card)] p-7"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="grid size-11 place-items-center rounded-2xl bg-white/[0.05] ring-1 ring-inset ring-white/10">
                <f.icon className="size-5 text-white" />
              </div>
              <h3 className="font-display mt-6 text-[18px] font-semibold tracking-tight text-white">{f.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-white/60">{f.desc}</p>
            </FadeUp>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function ProductScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.92, 1, 0.98]);

  return (
    <section id="product" ref={ref} className="relative py-32">
      <div className="mx-auto max-w-[1120px] px-6 text-center">
        <FadeUp className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/50">
          Product Workspace
        </FadeUp>
        <FadeUp
          delay={0.1}
          className="font-display mx-auto mt-3 max-w-2xl text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-6xl text-white"
        >
          A unified Business OS
          <span className="text-gradient"> built for precision.</span>
        </FadeUp>
      </div>

      <motion.div
        style={{ y, scale }}
        className="mx-auto mt-16 max-w-[1120px] px-4"
      >
        <div className="shadow-float relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[color:var(--color-elevated)] p-1.5">
          <div className="flex items-center gap-1.5 px-4 py-2.5">
            <div className="size-2.5 rounded-full bg-white/10" />
            <div className="size-2.5 rounded-full bg-white/10" />
            <div className="size-2.5 rounded-full bg-white/10" />
          </div>
          <img
            src={heroDashboard}
            alt="EngageAI Dashboard"
            className="w-full rounded-2xl object-cover"
          />
        </div>
      </motion.div>
    </section>
  );
}

function TestimonialSection() {
  const testimonials = [
    {
      quote: "Queue walk-aways dropped 38% in the first month. The automated WhatsApp 'you are next' alert alone paid for the entire platform.",
      author: "Priya Menon",
      role: "COO · Salon Spa Hub",
      initials: "P",
    },
    {
      quote: "We ran a 600-person summit with just two staff at check-in. Automated PDF certificates arrived on WhatsApp before attendees left.",
      author: "Rahul Bhatt",
      role: "Head of Events · TechSummit",
      initials: "R",
    },
    {
      quote: "The AI Copilot surfaces complaint clusters that used to take our staff weeks of spreadsheet analysis to uncover.",
      author: "Dr. Anita Shah",
      role: "Director · Metro Clinics",
      initials: "A",
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  return (
    <section className="border-t border-white/[0.05] py-32">
      <div className="mx-auto grid max-w-[1120px] items-center gap-16 px-6 md:grid-cols-2">
        <FadeUp>
          <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/50">Testimonials</div>
          <h2 className="font-display mt-3 text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-5xl text-white">
            Loved by operations,
            <br />
            <span className="text-gradient">trusted by customers.</span>
          </h2>
          <p className="mt-6 max-w-md text-[16px] leading-relaxed text-white/60">
            Real feedback from business leads using QueueAI, EventAI, and FeedbackAI to automate daily operations.
          </p>
        </FadeUp>

        <FadeUp delay={0.15} className="shadow-float rounded-3xl border border-white/[0.06] bg-[color:var(--color-card)] p-10 h-[360px] flex flex-col justify-center relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.4 }}
              className="w-full"
            >
              <blockquote className="font-display text-[22px] sm:text-[26px] leading-[1.25] tracking-[-0.02em] text-white">
                &ldquo;{testimonials[currentIndex].quote}&rdquo;
              </blockquote>
              <div className="mt-8 flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-semibold text-white">
                  {testimonials[currentIndex].initials}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{testimonials[currentIndex].author}</div>
                  <div className="text-[12px] text-white/50">{testimonials[currentIndex].role}</div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="absolute bottom-6 right-8 flex gap-2">
            {testimonials.map((_, idx) => (
              <div
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full cursor-pointer transition-all duration-300 ${idx === currentIndex ? "w-5 bg-white/70" : "w-1.5 bg-white/20 hover:bg-white/40"}`}
              />
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    { name: "Starter", price: "₹0", desc: "For single location businesses starting out.", cta: "Start free", features: ["1 workspace", "1 active module", "250 customers / mo", "Email support"] },
    { name: "Growth", price: "₹4,999", desc: "For growing multi-module teams.", cta: "Start 14-day trial", featured: true, features: ["3 workspaces", "All modules included", "10,000 customers / mo", "WhatsApp automation", "Full AI Copilot"] },
    { name: "Enterprise", price: "Custom", desc: "For large chains and enterprise events.", cta: "Talk to sales", features: ["Unlimited workspaces", "SSO & RBAC security", "Dedicated manager", "Custom AI models", "99.9% SLA"] },
  ];
  return (
    <section id="pricing" className="border-t border-white/[0.05] py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="text-center">
          <FadeUp className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/50">Pricing</FadeUp>
          <FadeUp delay={0.1} className="font-display mt-3 text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-6xl text-white">
            Simple, transparent pricing.
          </FadeUp>
        </div>

        <Stagger className="mt-16 grid gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <FadeUp
              key={p.name}
              className={`relative overflow-hidden rounded-3xl border p-8 ${
                p.featured
                  ? "border-white/20 bg-gradient-to-b from-white/[0.08] to-white/[0.02]"
                  : "border-white/[0.06] bg-[color:var(--color-card)]"
              }`}
            >
              {p.featured && (
                <div className="absolute right-6 top-6 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-white/80">
                  Most popular
                </div>
              )}
              <div className="text-sm font-medium text-white/70">{p.name}</div>
              <div className="mt-6 flex items-baseline gap-1.5">
                <div className="font-display text-5xl font-semibold tracking-tight text-white">{p.price}</div>
                {p.price !== "Custom" && <div className="text-sm text-white/50">/mo</div>}
              </div>
              <p className="mt-3 text-sm text-white/60">{p.desc}</p>

              <ul className="mt-8 space-y-2.5">
                {p.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-[14px] text-white/75">
                    <Check className="mt-0.5 size-4 text-[color:var(--color-success)]" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={`mt-8 w-full rounded-xl ${
                  p.featured ? "bg-white text-black hover:bg-white/90" : "bg-white/[0.06] text-white hover:bg-white/[0.1]"
                }`}
              >
                <Link to="/auth">{p.cta}</Link>
              </Button>
            </FadeUp>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const items = [
    { q: "How does QueueAI notify waiting customers?", a: "Customers scan a QR code to check in, receive live queue positions on mobile, and get automated WhatsApp alerts when it is their turn." },
    { q: "Can EventAI automatically issue certificates?", a: "Yes. When attendees scan their QR ticket or complete check-in, EventAI automatically generates and sends custom PDF certificates over WhatsApp." },
    { q: "What is FeedbackAI sentiment analysis?", a: "FeedbackAI triggers post-service WhatsApp reviews, analyzes sentiment in real-time, and clusters common customer issues automatically." },
    { q: "Can I connect custom WhatsApp Business API numbers?", a: "Yes. EngageAI supports official Meta WhatsApp Cloud API credentials per workspace." },
  ];
  return (
    <section id="faq" className="border-t border-white/[0.05] py-32">
      <div className="mx-auto max-w-3xl px-6">
        <FadeUp className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/50">FAQ</FadeUp>
        <FadeUp delay={0.1} className="font-display mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl text-white">
          Frequently asked questions.
        </FadeUp>

        <div className="mt-12 divide-y divide-white/[0.06] rounded-3xl border border-white/[0.06] bg-[color:var(--color-card)]">
          {items.map((it, i) => {
            const isOpen = open === i;
            return (
              <button
                key={it.q}
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full px-6 py-5 text-left"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[15px] font-medium text-white">{it.q}</span>
                  <Plus className={`size-4 shrink-0 text-white/50 transition-transform duration-500 ${isOpen ? "rotate-45" : ""}`} />
                </div>
                <motion.div
                  initial={false}
                  animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                  className="overflow-hidden"
                >
                  <p className="pt-3 text-[14px] leading-relaxed text-white/60">{it.a}</p>
                </motion.div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="aurora absolute -top-32 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-white/[0.05] blur-[100px]" />
      </div>
      <div className="mx-auto max-w-3xl px-6 text-center">
        <FadeUp className="font-display text-balance text-5xl font-semibold tracking-[-0.03em] sm:text-7xl text-white">
          Automate engagement <span className="text-gradient">on one workspace.</span>
        </FadeUp>
        <FadeUp delay={0.15} className="mx-auto mt-6 max-w-lg text-[16px] text-white/60">
          Set up your first virtual queue, event registry, or feedback trigger in under 10 minutes.
        </FadeUp>
        <FadeUp delay={0.25} className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Magnetic>
            <Button asChild size="lg" className="h-12 rounded-full bg-white px-8 text-black hover:bg-white/90">
              <Link to="/auth">
                Get started free <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </Magnetic>
        </FadeUp>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/[0.05] py-14">
      <div className="mx-auto flex max-w-[1120px] flex-col items-center justify-between gap-4 px-6 text-[13px] text-white/50 sm:flex-row">
        <div className="flex items-center gap-2">
          <div className="grid size-6 place-items-center rounded-md bg-white text-black">
            <Sparkles className="size-3" />
          </div>
          <span>© {new Date().getFullYear()} EngageAI. All rights reserved.</span>
        </div>
        <div className="flex gap-6">
          <Link to="/auth" className="hover:text-white transition-colors">Platform Log In</Link>
          <Link to="/app/dashboard" className="hover:text-white transition-colors">Workspace OS</Link>
        </div>
      </div>
    </footer>
  );
}

