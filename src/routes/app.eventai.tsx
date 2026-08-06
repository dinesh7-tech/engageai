import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Award, CalendarPlus, CheckCircle2, QrCode, Star, Users2, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { ChartCard } from "@/components/app/ChartCard";
import { CopilotPanel } from "@/components/app/CopilotPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { dispatchWhatsApp } from "@/lib/whatsapp-client";
import { emitActivity, emitNotification } from "@/lib/realtime.functions";

export const Route = createFileRoute("/app/eventai")({
  head: () => ({
    meta: [
      { title: "EventAI — AI Event Management | EngageAI" },
      { name: "description", content: "Create events, build registration forms, run QR check-in, and send WhatsApp reminders." },
    ],
  }),
  component: EventAIPage,
});

interface EventItem {
  id: string;
  name: string;
  date: string | null;
  venue: string | null;
  status: string;
  registrations: number;
  checkedIn: number;
}

interface Attendee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  checked_in: boolean;
}

function EventAIPage() {
  const { activeWorkspace } = useActiveWorkspace();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [activeEvent, setActiveEvent] = useState<EventItem | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal forms
  const [eventName, setEventName] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regOpen, setRegOpen] = useState(false);

  const workspaceId = activeWorkspace?.id;

  const fetchEvents = async () => {
    if (!workspaceId) return;
    setLoading(true);

    const { data: dbEvents, error: err1 } = await supabase
      .from("events")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (err1) {
      toast.error("Failed to load events");
      setLoading(false);
      return;
    }

    // Load registrations counts
    const mapped: EventItem[] = [];
    for (const e of dbEvents || []) {
      const { count: regCount } = await supabase
        .from("event_registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", e.id);

      const { count: checkinCount } = await supabase
        .from("event_registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", e.id)
        .eq("checked_in", true);

      mapped.push({
        id: e.id,
        name: e.name,
        date: e.date,
        venue: e.venue,
        status: e.status,
        registrations: regCount || 0,
        checkedIn: checkinCount || 0,
      });
    }

    setEvents(mapped);
    if (mapped.length > 0 && !activeEvent) {
      setActiveEvent(mapped[0]!);
    } else if (activeEvent) {
      const updated = mapped.find(m => m.id === activeEvent.id);
      if (updated) setActiveEvent(updated);
    }
    setLoading(false);
  };

  const fetchAttendees = async () => {
    if (!activeEvent) return;
    const { data, error } = await supabase
      .from("event_registrations")
      .select("id, name, email, phone, checked_in")
      .eq("event_id", activeEvent.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setAttendees(data || []);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [workspaceId]);

  useEffect(() => {
    fetchAttendees();
  }, [activeEvent]);

  async function handleCreateEvent() {
    if (!eventName.trim() || !workspaceId) return;
    const { data, error } = await supabase.from("events").insert({
      workspace_id: workspaceId,
      name: eventName.trim(),
      venue: eventVenue.trim() || "To be announced",
      date: eventDate ? new Date(eventDate).toISOString() : null,
      status: "upcoming",
    }).select().single();

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Event created successfully");
      setEventName("");
      setEventVenue("");
      setEventDate("");
      setCreateOpen(false);
      fetchEvents();
      void emitActivity({ data: { actor: "EventAI", text: `Created new event: ${eventName.trim()}` } });
    }
  }

  async function handleRegister() {
    if (!regName.trim() || !activeEvent || !workspaceId) return;
    const { error } = await supabase.from("event_registrations").insert({
      event_id: activeEvent.id,
      workspace_id: workspaceId,
      name: regName.trim(),
      email: regEmail.trim() || null,
      phone: regPhone.trim() || null,
      checked_in: false,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${regName.trim()} registered!`);
      setRegName("");
      setRegEmail("");
      setRegPhone("");
      setRegOpen(false);
      fetchEvents();
      fetchAttendees();

      if (regPhone.trim()) {
        await dispatchWhatsApp({
          to: regPhone.trim(),
          recipient: regName.trim(),
          templateId: "event_registration",
          variables: {
            name: regName.trim(),
            event: activeEvent.name,
            date: activeEvent.date || "TBD",
            venue: activeEvent.venue || "TBD",
            link: `${import.meta.env['VITE_APP_URL'] || window.location.origin}/join/${activeWorkspace?.slug || "biz"}`
          },
          workspaceId: workspaceId,
        });
      }
    }
  }

  async function checkInAttendee(id: string, name: string) {
    const attendee = attendees.find((a) => a.id === id);
    const { error } = await supabase
      .from("event_registrations")
      .update({ checked_in: true, checked_in_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${name} checked in!`);
      fetchEvents();
      fetchAttendees();
      void emitActivity({ data: { actor: "EventAI", text: `${name} checked in to event: ${activeEvent?.name}` } });

      if (attendee && attendee.phone) {
        await dispatchWhatsApp({
          to: attendee.phone,
          recipient: attendee.name,
          templateId: "event_checkin",
          variables: {
            name: attendee.name,
            event: activeEvent?.name || "Event"
          },
          workspaceId: workspaceId,
          notify: false,
        });
      }
    }
  }

  const totalRegistrations = events.reduce((acc, e) => acc + e.registrations, 0);
  const totalCheckedIn = events.reduce((acc, e) => acc + e.checkedIn, 0);

  return (
    <>
      <PageHeader
        title="EventAI"
        description="Run check-ins, send WhatsApp registration messages, and track attendance."
        actions={
          <div className="flex items-center gap-2">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <CalendarPlus className="size-4" /> Create Event
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Create Event</DialogTitle>
                  <DialogDescription>Setup your check-in portal.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="ev-name">Event Name</Label>
                    <Input id="ev-name" value={eventName} onChange={e => setEventName(e.target.value)} placeholder="Product Summit" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ev-venue">Venue</Label>
                    <Input id="ev-venue" value={eventVenue} onChange={e => setEventVenue(e.target.value)} placeholder="Grand Ballroom" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ev-date">Date</Label>
                    <Input id="ev-date" type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateEvent} className="w-full">Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total events", value: String(events.length), icon: CalendarPlus, hint: "active" },
          { label: "Registrations", value: String(totalRegistrations), hint: "all time", icon: Users2 },
          { label: "Checked-in", value: String(totalCheckedIn), icon: CheckCircle2, hint: "attendance" },
          { label: "Attendance rate", value: totalRegistrations > 0 ? `${((totalCheckedIn / totalRegistrations) * 100).toFixed(0)}%` : "0%", icon: Star, hint: "average" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mt-6">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/60 px-1">Your Events</h3>
          {events.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground panel text-sm">
              No events found. Setup your first event above.
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setActiveEvent(e)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                    activeEvent?.id === e.id
                      ? "border-primary/50 bg-primary/5 shadow-sm"
                      : "border-border/60 hover:bg-secondary/40"
                  }`}
                >
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm truncate">{e.name}</h4>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{e.venue}</p>
                  </div>
                  <Badge variant={e.status === "live" ? "default" : "secondary"}>
                    {e.status}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {activeEvent ? (
            <ChartCard
              title={activeEvent.name}
              subtitle={`${activeEvent.venue} · ${activeEvent.registrations} registrations`}
              actions={
                <Dialog open={regOpen} onOpenChange={setRegOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Plus className="size-3.5" /> Manual Register
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Register Attendee</DialogTitle>
                      <DialogDescription>Quick registration form.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <Label htmlFor="reg-name">Full Name</Label>
                        <Input id="reg-name" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Jane Doe" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="reg-email">Email Address</Label>
                        <Input id="reg-email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="jane@company.com" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="reg-phone">WhatsApp Number</Label>
                        <Input id="reg-phone" value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="+91XXXXXXXXXX" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleRegister} className="w-full">Submit</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              }
            >
              <Tabs defaultValue="attendees">
                <TabsList>
                  <TabsTrigger value="attendees">Attendees ({attendees.length})</TabsTrigger>
                  <TabsTrigger value="actions">Automation</TabsTrigger>
                </TabsList>

                <TabsContent value="attendees" className="mt-4">
                  {attendees.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No registrations yet. Open check-in form to acquire attendees.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendees.map((at) => (
                          <TableRow key={at.id}>
                            <TableCell className="font-medium">{at.name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {at.email || at.phone || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={at.checked_in ? "default" : "secondary"}>
                                {at.checked_in ? "Checked in" : "Pending"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {!at.checked_in && (
                                <Button size="sm" variant="ghost" onClick={() => checkInAttendee(at.id, at.name)}>
                                  Check In
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                <TabsContent value="actions" className="mt-4">
                  <div className="p-6 text-center text-sm text-muted-foreground border border-dashed rounded-xl">
                    Configure automations (reminders, feedback links, certificate generation) inside the global Automation portal.
                  </div>
                </TabsContent>
              </Tabs>
            </ChartCard>
          ) : (
            <div className="p-12 text-center text-muted-foreground panel">
              Create or select an event to manage attendees.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
