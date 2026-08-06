import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  QrCode, 
  Calendar, 
  MapPin, 
  Download, 
  Trash2, 
  Edit2, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  FileBadge
} from "lucide-react";

export const Route = createFileRoute("/ticket/$token")({
  component: PublicTicketPortal,
});

function PublicTicketPortal() {
  const { token } = Route.useParams();
  const [registration, setRegistration] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [ticketType, setTicketType] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit details modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [updating, setUpdating] = useState(false);

  // Cancellation state
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch registration by secret ticket_token
      const { data: reg, error: regErr } = await supabase
        .from("event_registrations")
        .select("*")
        .eq("ticket_token", token)
        .maybeSingle();

      if (regErr) throw regErr;
      if (!reg) {
        setLoading(false);
        return;
      }

      setRegistration(reg);
      setEditName(reg.name);
      setEditEmail(reg.email || "");
      setEditPhone(reg.phone || "");

      // Fetch event
      const { data: ev, error: evErr } = await supabase
        .from("events")
        .select("*")
        .eq("id", reg.event_id)
        .single();
      
      if (evErr) throw evErr;
      setEvent(ev);

      // Fetch ticket type
      if (reg.ticket_type_id) {
        const { data: tt } = await supabase
          .from("event_tickets")
          .select("*")
          .eq("id", reg.ticket_type_id)
          .single();
        setTicketType(tt);
      }

      setLoading(false);
    } catch (err: any) {
      console.error("Load ticket details failed:", err);
      setError(err.message || "Failed to load ticket details");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketDetails();
  }, [token]);

  // Update registration details (name, email, phone)
  const handleUpdateDetails = async () => {
    if (!editName.trim() || !registration) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("event_registrations")
        .update({
          name: editName.trim(),
          email: editEmail.trim() || null,
          phone: editPhone.trim() || null
        })
        .eq("id", registration.id);

      if (error) throw error;
      toast.success("Ticket details updated successfully!");
      setEditOpen(false);
      fetchTicketDetails();
    } catch (err: any) {
      toast.error(err.message || "Failed to update ticket details");
    } finally {
      setUpdating(false);
    }
  };

  // Cancel registration (delete)
  const handleCancelRegistration = async () => {
    if (!registration) return;
    setCancelling(true);
    try {
      const { error } = await supabase
        .from("event_registrations")
        .delete()
        .eq("id", registration.id);

      if (error) throw error;
      toast.success("Your registration has been cancelled successfully.");
      setRegistration(null);
      setCancelOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel registration");
    } finally {
      setCancelling(false);
    }
  };

  // Generate .ics calendar invite file and download
  const handleAddToCalendar = () => {
    if (!event) return;
    const start = event.date ? new Date(event.date) : new Date();
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours

    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, "");
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//EngageAI//Event Ticketing//EN
BEGIN:VEVENT
UID:${event.id}
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(start)}
DTEND:${formatICSDate(end)}
SUMMARY:${event.name}
DESCRIPTION:${event.description || "EngageAI Event Ticket check-in."}
LOCATION:${event.venue || "To be announced"}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.slug}-invite.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Calendar invite downloaded!");
  };

  // Generate Mock Certificate download
  const handleDownloadCertificate = () => {
    if (!event || !registration) return;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Certificate - ${registration.name}</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                font-family: sans-serif;
                background-color: #fafafa;
              }
              .border {
                border: 15px double #b45309;
                padding: 50px;
                width: 700px;
                background: white;
                text-align: center;
                box-shadow: 0 4px 10px rgba(0,0,0,0.05);
              }
              h1 { font-family: serif; font-size: 42px; margin: 10px 0; color: #78350f; }
              h2 { font-size: 20px; font-weight: normal; color: #451a03; }
              p { font-size: 16px; color: #78350f; margin: 20px 0; line-height: 1.5; }
              .date { font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="border">
              <h2>CERTIFICATE OF PARTICIPATION</h2>
              <p>This is proudly presented to</p>
              <h1>${registration.name}</h1>
              <p>for successfully attending the event</p>
              <h3>${event.name}</h3>
              <p>Held on <span class="date">${new Date(event.date).toLocaleDateString()}</span> at ${event.venue}.</p>
              <p style="margin-top:40px; font-style:italic;">EngageAI Business OS Verification Engine</p>
            </div>
            <script>
              window.onload = function() {
                window.print();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      toast.success("Certificate template generated!");
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
          <h2 className="text-xl font-bold text-destructive">Load Ticket Failed</h2>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center space-y-3">
          <AlertCircle className="size-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">Ticket Not Found</h2>
          <p className="text-muted-foreground text-sm">We couldn't find a registration matching this token.</p>
        </div>
      </div>
    );
  }

  const formattedDate = event.date 
    ? new Date(event.date).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) 
    : "TBD";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="pointer-events-none absolute inset-0 hero-glow opacity-10" />

      <Card className="w-full max-w-md border-border/80 bg-card relative overflow-hidden">
        {/* Ticket Header styling */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-primary via-purple-500 to-indigo-500" />
        
        <CardHeader className="text-center pb-2 pt-6">
          <Badge className="bg-primary/20 text-primary border-none rounded-full px-3 py-1 mx-auto mb-2">
            {ticketType?.name || "Attendee Entry"}
          </Badge>
          <CardTitle className="text-xl font-bold tracking-tight">Your Event Ticket</CardTitle>
          <p className="text-xs text-muted-foreground">{event?.name}</p>
        </CardHeader>

        <CardContent className="space-y-6 pt-4 text-center">
          {/* QR Code Container */}
          <div className="mx-auto flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-border shadow-sm max-w-[240px]">
            <QRCodeSVG
              value={registration.ticket_token}
              size={160}
              level="H"
              includeMargin={true}
            />
            <span className="text-[10px] text-muted-foreground font-mono mt-3 select-all">
              {registration.ticket_token}
            </span>
          </div>

          {/* Attendee Details Card */}
          <div className="panel p-4 bg-accent/20 rounded-xl text-left space-y-2.5">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Attendee Name</span>
              <span className="text-sm font-bold text-foreground">{registration.name}</span>
            </div>
            {registration.email && (
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Email Address</span>
                <span className="text-xs font-medium text-foreground">{registration.email}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Check-in Status</span>
                <Badge variant={registration.checked_in ? "default" : "secondary"} className="mt-1">
                  {registration.checked_in ? "Checked in" : "Pending"}
                </Badge>
              </div>
              {ticketType && (
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Tier Cost</span>
                  <span className="text-xs font-bold block mt-1">
                    {ticketType.ticket_type === "free" ? "Free" : `₹${ticketType.price}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Event Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="panel p-3 bg-secondary/30 rounded-xl">
              <Calendar className="size-4 text-primary mb-1.5" />
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Date & Time</span>
              <span className="text-xs font-bold mt-1 block leading-tight">{formattedDate}</span>
            </div>
            <div className="panel p-3 bg-secondary/30 rounded-xl">
              <MapPin className="size-4 text-primary mb-1.5" />
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Venue Address</span>
              <span className="text-xs font-bold mt-1 block leading-tight truncate">{event?.venue}</span>
            </div>
          </div>

          {/* Attendee Certificate Action (Shown only if Checked In) */}
          {registration.checked_in && (
            <Button 
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
              onClick={handleDownloadCertificate}
            >
              <FileBadge className="size-4" /> Download Certificate
            </Button>
          )}

          {/* Calendar Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleAddToCalendar}>
              <Calendar className="size-3.5" /> Add to Calendar
            </Button>
            {event?.venue && (
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full"
              >
                <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                  <MapPin className="size-3.5" /> Google Maps
                </Button>
              </a>
            )}
          </div>

          <div className="border-t border-border/50 pt-4 flex gap-2">
            {/* Edit details trigger */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-1 gap-1 text-xs">
                  <Edit2 className="size-3.5" /> Update Details
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Update Registration</DialogTitle>
                  <DialogDescription>Modify ticket Holder contact information.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1">
                    <Label htmlFor="ed-name">Full Name</Label>
                    <Input id="ed-name" value={editName} onChange={e => setEditName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ed-email">Email Address</Label>
                    <Input id="ed-email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ed-phone">WhatsApp Mobile</Label>
                    <Input id="ed-phone" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleUpdateDetails} disabled={updating} className="w-full">
                    {updating ? "Updating..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Cancel registration trigger */}
            <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-1 gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="size-3.5" /> Cancel Spot
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Cancel Ticket</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to cancel your registration? This action is permanent and frees up your spot.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0 mt-4">
                  <Button variant="ghost" onClick={() => setCancelOpen(false)}>No, Keep It</Button>
                  <Button variant="destructive" onClick={handleCancelRegistration} disabled={cancelling}>
                    {cancelling ? "Cancelling..." : "Yes, Cancel Spot"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
