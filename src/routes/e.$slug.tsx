import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { registerAttendee, logEventAnalytics } from "@/lib/event.functions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Users, 
  HelpCircle,
  Play,
  Heart
} from "lucide-react";

export const Route = createFileRoute("/e/$slug")({
  component: PublicEventLanding,
});

function PublicEventLanding() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const search: any = useSearch({ strict: false });

  const [event, setEvent] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [selectedTicketType, setSelectedTicketType] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form values state
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    setLoading(true);
    setError(null);

    supabase
      .from("events")
      .select("*")
      .eq("slug", slug)
      .maybeSingle()
      .then(async ({ data: eventData, error: eventErr }) => {
        if (eventErr) {
          console.error("Supabase event load error:", eventErr);
          setError(eventErr.message);
          setLoading(false);
          return;
        }

        if (!eventData) {
          setLoading(false);
          return;
        }

        setEvent(eventData);

        // Fetch form fields
        const { data: fieldsData } = await supabase
          .from("event_form_fields")
          .select("*")
          .eq("event_id", eventData.id)
          .order("sort_order", { ascending: true });
        
        setFields(fieldsData || []);

        // Fetch ticket tiers
        const { data: ticketsData } = await supabase
          .from("event_tickets")
          .select("*")
          .eq("event_id", eventData.id);

        setTicketTypes(ticketsData || []);
        if (ticketsData && ticketsData.length > 0) {
          setSelectedTicketType(ticketsData[0].id);
        }

        // Log analytics view (anonymous user)
        const referrer = search.ref || search.src || "direct";
        const isMobile = typeof window !== "undefined" && window.innerWidth < 768 ? "mobile" : "desktop";
        const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
        let browserName = "unknown";
        if (userAgent.includes("Chrome")) browserName = "Chrome";
        else if (userAgent.includes("Safari")) browserName = "Safari";
        else if (userAgent.includes("Firefox")) browserName = "Firefox";

        await logEventAnalytics({
          data: {
            eventId: eventData.id,
            workspaceId: eventData.workspace_id,
            actionType: "view",
            trafficSource: referrer,
            deviceType: isMobile,
            browser: browserName,
            country: "IN"
          }
        });

        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch exception:", err);
        setError(err.message || "Failed to load event.");
        setLoading(false);
      });
  }, [slug]);

  // Countdown timer countdown logic
  useEffect(() => {
    if (!event?.date) return;
    const interval = setInterval(() => {
      const difference = +new Date(event.date) - +new Date();
      if (difference <= 0) {
        clearInterval(interval);
        return;
      }
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [event?.date]);

  // Conditional Logic evaluator: returns true if the field should be visible
  const isFieldVisible = (field: any) => {
    if (!field.conditional_rules || field.conditional_rules.length === 0) return true;
    
    // Check if any rule conditions are satisfied
    return field.conditional_rules.every((rule: any) => {
      const dependentValue = formValues[rule.depends_on];
      return dependentValue === rule.value;
    });
  };

  const handleInputChange = (fieldName: string, val: any) => {
    setFormValues(prev => ({ ...prev, [fieldName]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    // Validate required fields (only visible ones)
    for (const f of fields) {
      if (f.required && isFieldVisible(f)) {
        const val = formValues[f.field_name];
        if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
          toast.error(`Please fill in required field: ${f.field_label}`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const primaryName = formValues["name"] || formValues["Name"] || "Attendee";
      const primaryEmail = formValues["email"] || formValues["Email"] || "";
      const primaryPhone = formValues["phone"] || formValues["Phone"] || formValues["mobile"] || "";

      // Call register server function
      const reg = await registerAttendee({
        data: {
          eventId: event.id,
          workspaceId: event.workspace_id,
          name: primaryName,
          email: primaryEmail,
          phone: primaryPhone,
          ticketTypeId: selectedTicketType || null,
          formResponses: formValues
        }
      });

      // Log analytical registration
      const referrer = search.ref || search.src || "direct";
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768 ? "mobile" : "desktop";
      await logEventAnalytics({
        data: {
          eventId: event.id,
          workspaceId: event.workspace_id,
          actionType: "registration",
          trafficSource: referrer,
          deviceType: isMobile
        }
      });

      toast.success("Successfully registered for event!");
      navigate({ to: `/ticket/${reg.ticket_token}` });
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

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
          <h2 className="text-xl font-bold text-destructive">Event Load Failed</h2>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center space-y-3">
          <AlertCircle className="size-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">Event Not Found</h2>
          <p className="text-muted-foreground text-sm">We couldn't find an event for '{slug}'.</p>
        </div>
      </div>
    );
  }

  // Theme-specific styling classes
  const getThemeClasses = () => {
    switch (event.theme) {
      case "Hackathon":
        return {
          bg: "bg-[#090514] text-gray-100",
          card: "bg-black/60 border-purple-500/30 text-white backdrop-blur",
          badge: "bg-purple-500/20 text-purple-400 border-purple-500/40",
          button: "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white",
          glow: "bg-purple-500/10"
        };
      case "Wedding":
        return {
          bg: "bg-[#faf6f0] text-amber-950",
          card: "bg-white/80 border-amber-200 text-amber-950 shadow-md backdrop-blur",
          badge: "bg-amber-100 text-amber-800 border-amber-300",
          button: "bg-amber-700 hover:bg-amber-600 text-white",
          glow: "bg-amber-200/20"
        };
      case "Festival":
        return {
          bg: "bg-[#0a0014] text-white",
          card: "bg-white/5 border-rose-500/20 text-white backdrop-blur",
          badge: "bg-rose-500/20 text-rose-400 border-rose-500/30",
          button: "bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 hover:opacity-90 text-white",
          glow: "bg-rose-500/10"
        };
      case "Dark":
        return {
          bg: "bg-[#0c0d0e] text-[#f0f0f0]",
          card: "bg-[#141517] border-[#2d2e30] text-white",
          badge: "bg-[#2d2e30] text-gray-300 border-none",
          button: "bg-white text-black hover:bg-gray-200",
          glow: "bg-white/5"
        };
      case "Minimal":
        return {
          bg: "bg-white text-black",
          card: "bg-white border-black text-black shadow-none",
          badge: "bg-black/10 text-black border-none",
          button: "bg-black text-white hover:bg-black/90",
          glow: "bg-black/5"
        };
      default: // Corporate / Professional
        return {
          bg: "bg-background text-foreground",
          card: "bg-card border-border/80 text-foreground",
          badge: "bg-primary/10 text-primary border-none",
          button: "bg-primary text-primary-foreground hover:opacity-90",
          glow: "bg-primary/10"
        };
    }
  };

  const theme = getThemeClasses();
  const sections = event.landing_page_sections || ["Banner", "About", "Registration"];
  const formattedDate = event.date 
    ? new Date(event.date).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) 
    : "TBD";

  return (
    <div className={`min-h-screen relative pb-16 ${theme.bg}`}>
      {/* Background glow styling */}
      <div className={`pointer-events-none absolute left-1/2 top-10 size-[500px] -translate-x-1/2 rounded-full blur-[120px] ${theme.glow}`} />

      {/* Render sections dynamically */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-12 relative z-10">
        
        {sections.includes("Banner") && (
          <header className="text-center space-y-4 pt-8">
            <Badge className={`rounded-full px-3 py-1 text-xs border ${theme.badge}`}>
              {event.subcategory || "Public Event"}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mt-2">{event.name}</h1>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto mt-2">
              {event.description || "Join us for an exclusive check-in event."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-sm">
              <span className="flex items-center gap-1.5">
                <Calendar className="size-4 text-primary" /> {formattedDate}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4 text-primary" /> {event.venue}
              </span>
            </div>
          </header>
        )}

        {sections.includes("Countdown") && event.date && (
          <section className="text-center">
            <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
              {[
                { label: "Days", val: timeLeft.days },
                { label: "Hours", val: timeLeft.hours },
                { label: "Mins", val: timeLeft.minutes },
                { label: "Secs", val: timeLeft.seconds }
              ].map(t => (
                <div key={t.label} className={`panel p-4 rounded-xl border ${theme.card} text-center`}>
                  <span className="block text-2xl md:text-3xl font-extrabold font-mono">{t.val}</span>
                  <span className="block text-[10px] uppercase font-semibold text-muted-foreground mt-1">{t.label}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {sections.includes("About") && event.description && (
          <section className={`panel p-6 md:p-8 rounded-[24px] border ${theme.card}`}>
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Play className="size-4 text-primary" /> About Event
            </h3>
            <p className="text-sm leading-relaxed opacity-85">{event.description}</p>
          </section>
        )}

        {sections.includes("Agenda") && (
          <section className={`panel p-6 md:p-8 rounded-[24px] border ${theme.card}`}>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Clock className="size-4 text-primary" /> Agenda Schedule
            </h3>
            <div className="space-y-6 relative pl-4 border-l border-border/40">
              {[
                { time: "09:00 AM", title: "Registrations & Reporting", desc: "Scan your QR ticket badge at the check-in counter." },
                { time: "10:00 AM", title: "Opening Address", desc: "Welcome briefing and overview." },
                { time: "01:00 PM", title: "Lunch Networking", desc: "Interact with partners and attendees." },
                { time: "04:30 PM", title: "Valedictory & Checkout", desc: "Issue participation certificates." }
              ].map((ag, idx) => (
                <div key={idx} className="relative group">
                  <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-primary" />
                  <div className="flex justify-between">
                    <span className="text-[10px] font-semibold text-primary uppercase">{ag.time}</span>
                  </div>
                  <h4 className="font-bold text-sm mt-1">{ag.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{ag.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {sections.includes("FAQ") && (
          <section className={`panel p-6 md:p-8 rounded-[24px] border ${theme.card}`}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <HelpCircle className="size-4 text-primary" /> Frequently Asked Questions
            </h3>
            <div className="space-y-4 divide-y divide-border">
              {[
                { q: "How do I check in?", a: "After completing this registration form, you will receive a unique QR Ticket code. Show this code at the gate to check in." },
                { q: "Is this event online or offline?", a: "This is a physical event taking place at the venue listed above. Please report on time." }
              ].map((faq, idx) => (
                <div key={idx} className="pt-4 first:pt-0">
                  <h4 className="font-semibold text-sm">{faq.q}</h4>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {sections.includes("Registration") && (
          <section className={`panel p-6 md:p-8 rounded-[24px] border ${theme.card}`}>
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold">Register Your Spot</h3>
              <p className="text-xs text-muted-foreground mt-1">Please enter your details to reserve your ticket.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Ticket Tier Selector if multiple exist */}
              {ticketTypes.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Select Ticket Tier</label>
                  <select
                    value={selectedTicketType}
                    onChange={(e) => setSelectedTicketType(e.target.value)}
                    className="w-full bg-secondary border border-border/80 h-10 px-3 rounded-lg text-sm text-foreground focus-visible:ring-1 focus-visible:ring-primary"
                  >
                    {ticketTypes.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.ticket_type === "free" ? "Free" : `₹${t.price}`})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dynamic Registration Fields */}
              {fields.map((f) => {
                if (!isFieldVisible(f)) return null;

                return (
                  <div key={f.id} className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      {f.field_label}
                      {f.required && <span className="text-destructive">*</span>}
                    </label>

                    {f.field_type === "select" ? (
                      <select
                        value={formValues[f.field_name] || ""}
                        onChange={(e) => handleInputChange(f.field_name, e.target.value)}
                        required={f.required}
                        className="w-full bg-secondary border border-border/80 h-10 px-3 rounded-lg text-sm text-foreground focus-visible:ring-1 focus-visible:ring-primary"
                      >
                        <option value="">Select an option</option>
                        {Array.isArray(f.field_options) && f.field_options.map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : f.field_type === "textarea" ? (
                      <textarea
                        value={formValues[f.field_name] || ""}
                        onChange={(e) => handleInputChange(f.field_name, e.target.value)}
                        placeholder={`Enter your ${f.field_label.toLowerCase()}`}
                        required={f.required}
                        className="w-full bg-secondary border border-border/80 min-h-20 p-3 rounded-lg text-sm text-foreground focus-visible:ring-1 focus-visible:ring-primary"
                      />
                    ) : f.field_type === "checkbox" ? (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          checked={formValues[f.field_name] || false}
                          onChange={(e) => handleInputChange(f.field_name, e.target.checked)}
                          required={f.required}
                          className="size-4 accent-primary rounded"
                        />
                        <span className="text-xs">{f.field_label}</span>
                      </div>
                    ) : (
                      <Input
                        type={f.field_type}
                        value={formValues[f.field_name] || ""}
                        onChange={(e) => handleInputChange(f.field_name, e.target.value)}
                        placeholder={`Enter your ${f.field_label.toLowerCase()}`}
                        required={f.required}
                        className="bg-secondary/40 border-border/80"
                      />
                    )}
                  </div>
                );
              })}

              <Button
                type="submit"
                className={`w-full gap-2 mt-6 h-11 ${theme.button}`}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Registering...
                  </>
                ) : (
                  <>
                    <Users className="size-4" /> Complete Registration
                  </>
                )}
              </Button>
            </form>
          </section>
        )}

        <footer className="text-center text-[10px] text-muted-foreground pt-12">
          Powered by EngageAI Event OS. Secure public ticketing. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
