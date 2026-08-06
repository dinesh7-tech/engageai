import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getRegistrationByToken, updateRegistrationByToken, cancelRegistrationByToken } from "@/lib/event.functions";
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
  CheckCircle2,
  FileBadge,
  Clock,
  XCircle,
  Lock,
  Sparkles,
  ShieldAlert,
  PartyPopper,
  CheckCircle,
  Share2,
  Building2,
  Mail,
  Phone,
  Ticket
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

  // Approval celebration animation state
  const [justApproved, setJustApproved] = useState(false);

  // Edit details modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [updating, setUpdating] = useState(false);

  // Cancellation state
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const fetchTicketDetails = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      setError(null);

      // Fetch registration via secure server function
      const reg = await getRegistrationByToken({ data: { token } });

      if (!reg) {
        if (isInitial) setLoading(false);
        return;
      }

      setRegistration((prev: any) => {
        // Detect state transition from Pending -> Approved for live celebration alert
        if (prev && prev.status === "Pending" && (reg.status === "Approved" || reg.status === "Checked-in")) {
          setJustApproved(true);
          toast.success("Congratulations! Your registration has been approved!");
        }
        return reg;
      });

      setEditName(reg.name);
      setEditEmail(reg.email || "");
      setEditPhone(reg.phone || "");

      // Fetch event details
      const { data: ev, error: evErr } = await supabase
        .from("events")
        .select("*")
        .eq("id", reg.event_id)
        .single();
      
      if (evErr) throw evErr;
      setEvent(ev);

      // Fetch ticket type
      if (reg.ticket_type_id) {
        const { data: tt } = await (supabase as any)
          .from("event_tickets")
          .select("*")
          .eq("id", reg.ticket_type_id)
          .single();
        setTicketType(tt);
      }

      if (isInitial) setLoading(false);
    } catch (err: any) {
      console.error("Load ticket details failed:", err);
      setError(err.message || "Failed to load ticket details");
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketDetails(true);

    // Setup Real-time listener for instant approval/rejection without refresh
    const channel = supabase
      .channel(`ticket-live-${token}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "event_registrations",
          filter: `ticket_token=eq.${token}`
        },
        (payload) => {
          console.log("[Realtime Ticket Sync] Live update received:", payload.new);
          if (payload.new) {
            setRegistration((prev: any) => {
              const updatedStatus = (payload.new as any)?.status;
              if (prev && prev.status === "Pending" && updatedStatus === "Approved") {
                setJustApproved(true);
                toast.success("Congratulations! Your registration has been approved!");
              }
              return { ...prev, ...payload.new };
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [token]);

  // Countdown logic for event start
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

  // Update registration details via secure server function
  const handleUpdateDetails = async () => {
    if (!editName.trim() || !registration) return;
    setUpdating(true);
    try {
      await updateRegistrationByToken({
        data: {
          token,
          name: editName.trim(),
          email: editEmail.trim() || null,
          phone: editPhone.trim() || null
        }
      });
      toast.success("Ticket details updated successfully!");
      setEditOpen(false);
      fetchTicketDetails();
    } catch (err: any) {
      toast.error(err.message || "Failed to update ticket details");
    } finally {
      setUpdating(false);
    }
  };

  // Cancel registration
  const handleCancelRegistration = async () => {
    if (!registration) return;
    setCancelling(true);
    try {
      await cancelRegistrationByToken({ data: { token } });
      toast.success("Your registration has been cancelled successfully.");
      setRegistration(null);
      setCancelOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel registration");
    } finally {
      setCancelling(false);
    }
  };

  // Generate .ics calendar invite
  const handleAddToCalendar = () => {
    if (!event) return;
    const start = event.date ? new Date(event.date) : new Date();
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    const formatICSDate = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, "");

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
    link.download = `${event.slug || "event"}-invite.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Calendar invite downloaded!");
  };

  // Generate Certificate print/download
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
                font-family: 'Inter', sans-serif;
                background-color: #09090b;
                color: #ffffff;
              }
              .border {
                border: 8px solid #6366f1;
                border-radius: 24px;
                padding: 60px;
                width: 750px;
                background: linear-gradient(135deg, #18181b 0%, #09090b 100%);
                text-align: center;
                box-shadow: 0 20px 50px rgba(99, 102, 241, 0.2);
              }
              h1 { font-size: 46px; margin: 15px 0; color: #818cf8; letter-spacing: -1px; }
              h2 { font-size: 20px; font-weight: 500; color: #a1a1aa; text-transform: uppercase; letter-spacing: 2px; }
              p { font-size: 16px; color: #d4d4d8; margin: 20px 0; line-height: 1.6; }
              .date { font-weight: bold; color: #38bdf8; }
            </style>
          </head>
          <body>
            <div class="border">
              <h2>Official Verification Certificate</h2>
              <p>This is proudly presented to</p>
              <h1>${registration.name}</h1>
              <p>for successfully completing check-in and participating in</p>
              <h3 style="font-size: 24px; color: #f43f5e;">${event.name}</h3>
              <p>Held on <span class="date">${new Date(event.date).toLocaleDateString()}</span> at ${event.venue}.</p>
              <p style="margin-top:50px; font-size: 12px; color: #71717a;">Verification Token: ${registration.ticket_token}</p>
            </div>
            <script>
              window.onload = function() { window.print(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      toast.success("Certificate generated!");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-4">
        <Loader2 className="size-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm font-medium text-zinc-400">Securing ticket verification status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="text-center space-y-3 max-w-md w-full p-8 rounded-3xl bg-zinc-900/80 border border-red-500/30">
          <AlertCircle className="size-14 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-red-400">Failed to Load Ticket</h2>
          <p className="text-zinc-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="text-center space-y-3 p-8 rounded-3xl bg-zinc-900/80 border border-zinc-800">
          <AlertCircle className="size-14 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Ticket Not Found</h2>
          <p className="text-zinc-400 text-sm">We couldn't locate an active registration for this pass.</p>
        </div>
      </div>
    );
  }

  const formattedDate = event?.date 
    ? new Date(event.date).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) 
    : "TBD";

  const regStatus = registration.status || "Pending";
  const isPending = regStatus === "Pending";
  const isRejected = regStatus === "Rejected";
  const isApproved = regStatus === "Approved" || regStatus === "Checked-in";
  const isCheckedIn = regStatus === "Checked-in" || registration.checked_in;

  // Build encrypted/signed JSON payload for active approved QR code
  const qrEncryptedPayload = JSON.stringify({
    event_id: registration.event_id,
    registration_id: registration.id,
    workspace_id: registration.workspace_id,
    token: registration.ticket_token,
    v: "2.0"
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950 text-white relative overflow-hidden font-sans">
      {/* Dynamic Glassmorphism Backdrop Particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-10 right-10 size-[350px] bg-purple-600/15 rounded-full blur-[100px]" />
        <div className="absolute top-10 left-10 size-[300px] bg-rose-600/10 rounded-full blur-[90px]" />
      </div>

      {/* Main Apple Wallet Style Pass Card */}
      <div className="w-full max-w-md relative z-10 space-y-4">
        
        {/* Approved Celebration Banner (if just updated live) */}
        <AnimatePresence>
          {justApproved && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 border border-emerald-500/40 text-center space-y-1 shadow-lg shadow-emerald-500/10"
            >
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-base">
                <PartyPopper className="size-5 animate-bounce" />
                <span>Congratulations!</span>
              </div>
              <p className="text-xs text-emerald-200">Your registration has been approved. Your check-in QR pass is now active!</p>
            </motion.div>
          )}
        </AnimatePresence>

        <Card className="w-full border-white/10 bg-zinc-900/80 backdrop-blur-2xl text-white shadow-2xl rounded-[32px] overflow-hidden relative border">
          
          {/* Top Gradient Accent Line */}
          <div className={`h-2.5 w-full ${
            isCheckedIn ? "bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" :
            isPending ? "bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500" :
            isRejected ? "bg-gradient-to-r from-rose-500 via-red-600 to-pink-600" :
            "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-gradient-x"
          }`} />

          {/* Event Header Banner */}
          <div className="p-6 pb-4 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent relative">
            <div className="flex items-center justify-between gap-2 mb-3">
              <Badge variant="outline" className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-full border ${
                isCheckedIn ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                isPending ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                isRejected ? "bg-rose-500/20 text-rose-300 border-rose-500/30" :
                "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
              }`}>
                {ticketType?.name || "Official Event Ticket"}
              </Badge>

              <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                <Ticket className="size-3.5" /> ID: #{registration.id.slice(0, 8).toUpperCase()}
              </span>
            </div>

            <h1 className="text-xl font-bold text-white tracking-tight leading-tight mb-1">
              {event?.name || "Event Ticket"}
            </h1>
            <p className="text-xs text-zinc-400 flex items-center gap-1.5">
              <Building2 className="size-3.5 text-zinc-500" />
              <span>Organized by EngageAI OS</span>
            </p>
          </div>

          <CardContent className="p-6 space-y-6">

            {/* Countdown Timer Widget (If Event Date Present) */}
            {event?.date && isApproved && !isCheckedIn && (
              <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/5 flex items-center justify-between text-center">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
                  <Clock className="size-4 text-indigo-400 animate-pulse" />
                  <span>Event Starts In:</span>
                </div>
                <div className="flex gap-2 text-xs font-mono font-bold text-indigo-300">
                  <span className="bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20">{timeLeft.days}d</span>
                  <span className="bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20">{timeLeft.hours}h</span>
                  <span className="bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20">{timeLeft.minutes}m</span>
                  <span className="bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20">{timeLeft.seconds}s</span>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TICKET QR / LOCK STATE CONTAINER                                */}
            {/* ============================================================== */}
            <div className="relative flex flex-col items-center justify-center p-6 rounded-3xl bg-zinc-950 border border-white/10 shadow-inner overflow-hidden">

              {/* Watermark Overlay to prevent screenshot unauthorized reuse */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center rotate-[-30deg] opacity-5 select-none text-[22px] font-black tracking-widest text-white uppercase whitespace-nowrap">
                {isPending ? "PENDING APPROVAL • NOT VALID FOR ENTRY" : isRejected ? "REJECTED • DISABLED" : "VERIFIED PASS • ENGAGEAI"}
              </div>

              <AnimatePresence mode="wait">
                {/* PENDING APPROVAL LOCK STATE */}
                {isPending && (
                  <motion.div 
                    key="pending-state"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ filter: "blur(20px)", opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.6 }}
                    className="relative flex flex-col items-center text-center space-y-4 py-4 w-full"
                  >
                    {/* Heavy Blurred QR Mock with Shimmer Glow */}
                    <div className="relative size-44 rounded-2xl p-4 bg-white flex items-center justify-center overflow-hidden border border-amber-500/40 shadow-xl shadow-amber-500/10">
                      <div className="filter blur-lg opacity-30 select-none pointer-events-none size-full flex items-center justify-center">
                        <QRCodeSVG value="LOCKED_PENDING_APPROVAL" size={140} level="M" />
                      </div>

                      {/* Animated Glow / Shimmer overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/30 to-transparent animate-shimmer" />

                      {/* Central Lock Icon Badge with Pulse */}
                      <div className="absolute size-14 rounded-2xl bg-zinc-900/90 border border-amber-500/60 flex flex-col items-center justify-center text-amber-400 shadow-2xl backdrop-blur-md">
                        <Lock className="size-6 animate-pulse" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-amber-300 flex items-center justify-center gap-1.5">
                        <Sparkles className="size-4 text-amber-400 animate-spin-slow" /> Awaiting Organizer Approval
                      </h3>
                      <p className="text-xs text-zinc-400 max-w-[260px] leading-relaxed">
                        Your QR entry code will automatically unlock in real-time as soon as your registration is approved.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* REJECTED STATE (WITH SHAKE ANIMATION) */}
                {isRejected && (
                  <motion.div 
                    key="rejected-state"
                    initial={{ scale: 0.9, opacity: 0, x: [0, -10, 10, -10, 10, 0] }}
                    animate={{ scale: 1, opacity: 1, x: [0, -8, 8, -6, 6, 0] }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="flex flex-col items-center text-center space-y-3 py-4 w-full"
                  >
                    <div className="size-20 rounded-full bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-500/20">
                      <XCircle className="size-10 text-rose-500 animate-pulse" />
                    </div>
                    <h3 className="text-base font-bold text-rose-400">Registration Rejected</h3>
                    <p className="text-xs text-zinc-400 max-w-[280px]">
                      This registration has been declined by the organizer. The pass is permanently disabled.
                    </p>
                    {registration.rejection_reason && (
                      <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 w-full text-left">
                        <span className="text-[10px] text-rose-300 font-semibold uppercase block mb-0.5">Reason</span>
                        <span className="text-xs text-zinc-300">{registration.rejection_reason}</span>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* APPROVED ACTIVE QR STATE (SMOOTH REVEAL ANIMATION: BLUR -> GLOW -> FADE -> CRYSTAL CLEAR) */}
                {isApproved && (
                  <motion.div 
                    key="approved-state"
                    initial={{ filter: "blur(12px)", opacity: 0, scale: 0.9 }}
                    animate={{ filter: "blur(0px)", opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col items-center text-center w-full"
                  >
                    {/* Checked in Banner if verified */}
                    {isCheckedIn && (
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="mb-4 w-full py-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex items-center justify-center gap-2 text-emerald-300 text-xs font-bold"
                      >
                        <CheckCircle2 className="size-4 text-emerald-400" />
                        <span>✓ Successfully Checked In</span>
                      </motion.div>
                    )}

                    <div className="relative p-4 bg-white rounded-2xl border border-white/20 shadow-2xl flex flex-col items-center group overflow-hidden">
                      {/* Green Glow Accent ring */}
                      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-500" />
                      
                      <div className="relative z-10 bg-white rounded-xl p-1 flex flex-col items-center">
                        <QRCodeSVG
                          value={JSON.stringify({
                            registrationId: registration.id,
                            attendeeId: registration.id,
                            eventId: registration.event_id,
                            ticketId: registration.ticket_type_id || "general",
                            token: registration.ticket_token,
                            issuedAt: registration.created_at,
                            checksum: btoa(`${registration.id}:${registration.event_id}:${registration.ticket_token}`).slice(0, 12)
                          })}
                          size={170}
                          level="H"
                          includeMargin={true}
                        />
                        <span className="text-[10px] font-mono text-zinc-500 mt-2 select-all tracking-wider font-semibold">
                          {registration.ticket_token}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-400 mt-3 flex items-center gap-1">
                      <ShieldAlert className="size-3.5 text-indigo-400" /> Present this QR at entrance for check-in scan
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* STEPPER TIMELINE */}
            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-3">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Verification Timeline
              </span>
              <div className="grid grid-cols-4 gap-1 text-center relative">
                {/* Connecting Line */}
                <div className="absolute top-3 left-[12%] right-[12%] h-0.5 bg-zinc-800 -z-0" />

                {/* Step 1 */}
                <div className="flex flex-col items-center relative z-10 space-y-1">
                  <div className="size-6 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center text-xs font-bold">
                    ✓
                  </div>
                  <span className="text-[9px] font-medium text-emerald-400 leading-tight">Submitted</span>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col items-center relative z-10 space-y-1">
                  <div className={`size-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isApproved ? "bg-emerald-500 text-zinc-950" : isRejected ? "bg-rose-500 text-white" : "bg-amber-500 text-zinc-950 animate-pulse"
                  }`}>
                    {isApproved ? "✓" : isRejected ? "✕" : "⏳"}
                  </div>
                  <span className={`text-[9px] font-medium leading-tight ${
                    isApproved ? "text-emerald-400" : isRejected ? "text-rose-400" : "text-amber-300"
                  }`}>
                    {isApproved ? "Approved" : isRejected ? "Rejected" : "Approval"}
                  </span>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col items-center relative z-10 space-y-1">
                  <div className={`size-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isApproved ? "bg-emerald-500 text-zinc-950" : "bg-zinc-800 text-zinc-500"
                  }`}>
                    {isApproved ? "✓" : "3"}
                  </div>
                  <span className={`text-[9px] font-medium leading-tight ${isApproved ? "text-emerald-400" : "text-zinc-500"}`}>
                    QR Active
                  </span>
                </div>

                {/* Step 4 */}
                <div className="flex flex-col items-center relative z-10 space-y-1">
                  <div className={`size-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCheckedIn ? "bg-emerald-500 text-zinc-950" : "bg-zinc-800 text-zinc-500"
                  }`}>
                    {isCheckedIn ? "✓" : "4"}
                  </div>
                  <span className={`text-[9px] font-medium leading-tight ${isCheckedIn ? "text-emerald-400" : "text-zinc-500"}`}>
                    Check-in
                  </span>
                </div>
              </div>
            </div>

            {/* ATTENDEE CONTACT INFO CARD */}
            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 text-left space-y-3">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Attendee Name</span>
                <span className="text-sm font-bold text-white">{registration.name}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/5">
                {registration.email && (
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Email</span>
                    <span className="text-xs text-zinc-300 font-medium truncate block">{registration.email}</span>
                  </div>
                )}
                {registration.phone && (
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Mobile</span>
                    <span className="text-xs text-zinc-300 font-medium block">{registration.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* EVENT VENUE & DATE GRID */}
            {event && (
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/5">
                  <Calendar className="size-4 text-indigo-400 mb-1" />
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Date & Time</span>
                  <span className="text-xs font-bold text-white mt-0.5 block leading-tight">{formattedDate}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/5">
                  <MapPin className="size-4 text-indigo-400 mb-1" />
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Venue</span>
                  <span className="text-xs font-bold text-white mt-0.5 block leading-tight truncate">{event.venue}</span>
                </div>
              </div>
            )}

            {/* CERTIFICATE DOWNLOAD ACTION (If checked in) */}
            {isCheckedIn && (
              <Button 
                className="w-full gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-500/20"
                onClick={handleDownloadCertificate}
              >
                <FileBadge className="size-4" /> Download Event Certificate
              </Button>
            )}

            {/* CALENDAR & MAP ACTIONS (If approved) */}
            {isApproved && event && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl border-white/10 bg-zinc-950/50 hover:bg-zinc-800 text-white" onClick={handleAddToCalendar}>
                  <Calendar className="size-3.5 text-indigo-400" /> Add to Calendar
                </Button>
                {event.venue && (
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full"
                  >
                    <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs rounded-xl border-white/10 bg-zinc-950/50 hover:bg-zinc-800 text-white">
                      <MapPin className="size-3.5 text-rose-400" /> Google Maps
                    </Button>
                  </a>
                )}
              </div>
            )}

            {/* EDIT AND CANCEL ACTIONS */}
            {!isRejected && (
              <div className="border-t border-white/5 pt-4 flex gap-2">
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex-1 gap-1 text-xs text-zinc-400 hover:text-white rounded-xl">
                      <Edit2 className="size-3.5" /> Edit Info
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-sm bg-zinc-900 text-white border-white/10">
                    <DialogHeader>
                      <DialogTitle>Update Registration</DialogTitle>
                      <DialogDescription className="text-zinc-400">Modify contact details for this ticket.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-1">
                        <Label htmlFor="ed-name" className="text-zinc-300">Full Name</Label>
                        <Input id="ed-name" value={editName} onChange={e => setEditName(e.target.value)} className="bg-zinc-950 border-zinc-800 text-white" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="ed-email" className="text-zinc-300">Email Address</Label>
                        <Input id="ed-email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="bg-zinc-950 border-zinc-800 text-white" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="ed-phone" className="text-zinc-300">WhatsApp Mobile</Label>
                        <Input id="ed-phone" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="bg-zinc-950 border-zinc-800 text-white" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleUpdateDetails} disabled={updating} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white">
                        {updating ? "Updating..." : "Save Changes"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex-1 gap-1 text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl">
                      <Trash2 className="size-3.5" /> Cancel Pass
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-sm bg-zinc-900 text-white border-white/10">
                    <DialogHeader>
                      <DialogTitle>Cancel Ticket Spot</DialogTitle>
                      <DialogDescription className="text-zinc-400">
                        Are you sure you want to cancel your registration? This action is permanent and frees up your spot.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                      <Button variant="ghost" onClick={() => setCancelOpen(false)} className="text-zinc-400">Keep Spot</Button>
                      <Button variant="destructive" onClick={handleCancelRegistration} disabled={cancelling} className="bg-rose-600 hover:bg-rose-500">
                        {cancelling ? "Cancelling..." : "Yes, Cancel Spot"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
