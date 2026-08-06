import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Html5Qrcode } from "html5-qrcode";
import confetti from "canvas-confetti";
import {
  Users2,
  CheckCircle2,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Sparkles,
  Star,
  Brain,
  Shield,
  ShieldAlert,
  BadgeCheck,
  FileText,
  ArrowRight,
  ArrowLeft,
  Info,
  Award,
  Search,
  Eye,
  Edit,
  Trash2,
  Check,
  X,
  Download,
  Mail,
  MessageSquare,
  MoreVertical,
  QrCode,
  StickyNote,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  UserCheck,
  User,
  Users,
  Calendar,
  MapPin,
  Globe,
  Filter,
  Camera,
  Flashlight,
  SwitchCamera,
  Play,
  Pause,
  RefreshCw,
  PartyPopper
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { QRCodeSVG } from "qrcode.react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  approveRegistration,
  rejectRegistration,
  deleteRegistration,
  updateRegistrationNotes,
  updateRegistrationDetails,
  bulkApproveRegistrations,
  bulkRejectRegistrations,
  bulkDeleteRegistrations,
  checkInAttendee,
  checkInAttendeeByQR
} from "@/lib/event.functions";

import { supabase } from "@/integrations/supabase/client";
import { evaluateRegistrationCandidate, generateEventAIShortlist } from "@/lib/gemini.functions";

export interface EventAttendeesTabProps {
  activeEvent: any;
  attendees: any[];
  ticketTiers?: any[];
  onRefresh: () => void;
}

const COLORS = ["#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6"];
const PAGE_SIZE = 15;

function getInitials(name: string) {
  return (name || "Attendee")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getInitialColor(name: string) {
  const colors = [
    "bg-violet-500/20 text-violet-400",
    "bg-blue-500/20 text-blue-400",
    "bg-emerald-500/20 text-emerald-400",
    "bg-amber-500/20 text-amber-400",
    "bg-rose-500/20 text-rose-400",
    "bg-cyan-500/20 text-cyan-400",
    "bg-pink-500/20 text-pink-400"
  ];
  let hash = 0;
  const str = name || "Attendee";
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class AttendeesErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: any) {
    console.error("AttendeesTab Error Boundary caught an exception:", error, errorInfo);
  }

  override render() {

    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 rounded-2xl border border-destructive/20 bg-destructive/10 text-center space-y-3">
          <AlertCircle className="size-10 text-destructive mx-auto" />
          <h3 className="text-base font-bold text-destructive">Attendees Module Error</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            An unexpected render issue occurred ({this.state.error?.message || "Unknown error"}).
          </p>
          <Button size="sm" variant="outline" onClick={() => this.setState({ hasError: false })}>
            Reload Attendees Panel
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function EventAttendeesTab(props: EventAttendeesTabProps) {
  return (
    <AttendeesErrorBoundary>
      <EventAttendeesContent {...props} />
    </AttendeesErrorBoundary>
  );
}

function EventAttendeesContent({ activeEvent, attendees = [], ticketTiers = [], onRefresh }: EventAttendeesTabProps) {
  const safeAttendees = Array.isArray(attendees) ? attendees : [];

  const [statusTab, setStatusTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPayment, setFilterPayment] = useState<string>("all");
  const [smartFilter, setSmartFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  // AI Shortlist state
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiShortlistOpen, setAiShortlistOpen] = useState(false);
  const [aiShortlistCount, setAiShortlistCount] = useState(10);
  const [aiShortlistResult, setAiShortlistResult] = useState<any>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewAttendee, setViewAttendee] = useState<any>(null);
  const [notesValue, setNotesValue] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  // Action and Dialog states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectAttendee, setRejectAttendee] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [attendeeToDelete, setAttendeeToDelete] = useState<any>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editAttendee, setEditAttendee] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const [scannerOpen, setScannerOpen] = useState(false);
  const [qrInputValue, setQrInputValue] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  // Single AI candidate analyzing
  const [singleAiLoading, setSingleAiLoading] = useState(false);

  const pendingCount = useMemo(() => safeAttendees.filter((a) => (a?.status || "Pending") === "Pending").length, [safeAttendees]);
  const approvedCount = useMemo(() => safeAttendees.filter((a) => a?.status === "Approved").length, [safeAttendees]);
  const rejectedCount = useMemo(() => safeAttendees.filter((a) => a?.status === "Rejected").length, [safeAttendees]);
  const checkedInCount = useMemo(() => safeAttendees.filter((a) => a?.status === "Checked-in" || a?.checked_in).length, [safeAttendees]);
  const attendanceRate = safeAttendees.length > 0 ? Math.round((checkedInCount / safeAttendees.length) * 100) : 0;

  // Filtered and paginated attendees
  const filteredAttendees = useMemo(() => {
    let list = [...safeAttendees];

    // Status filter
    if (statusTab !== "all") {
      if (statusTab === "checked-in") {
        list = list.filter((a) => a?.status === "Checked-in" || a?.checked_in);
      } else {
        list = list.filter((a) => (a?.status || "Pending") === statusTab);
      }
    }

    // Smart Filters
    if (smartFilter === "high_score") {
      list = list.filter((a) => (a?.ai_score || 0) >= 80 || a?.ai_recommendation === "High Potential");
    } else if (smartFilter === "needs_review") {
      list = list.filter((a) => (a?.status || "Pending") === "Pending");
    } else if (smartFilter === "missing_resume") {
      list = list.filter((a) => {
        const responses = a?.form_responses || {};
        return !responses.resume && !responses.Resume && !responses.portfolio && !responses.github;
      });
    }

    // Payment filter
    if (filterPayment === "paid") {
      list = list.filter((a) => a?.payment_status === "paid");
    } else if (filterPayment === "unpaid") {
      list = list.filter((a) => a?.payment_status !== "paid");
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => {
        const responses = a?.form_responses || {};
        const college = String(responses.college || responses.College || "").toLowerCase();
        const skills = String(responses.skills || responses.Skills || "").toLowerCase();
        return (
          a?.name?.toLowerCase().includes(q) ||
          a?.email?.toLowerCase().includes(q) ||
          a?.phone?.toLowerCase().includes(q) ||
          college.includes(q) ||
          skills.includes(q)
        );
      });
    }

    return list;
  }, [safeAttendees, statusTab, smartFilter, filterPayment, searchQuery]);

  // Handle single AI evaluation
  const handleSingleAiEvaluate = async (at: any) => {
    if (!at || !activeEvent?.id) {
      toast.error("Invalid attendee or active event.");
      return;
    }
    setSingleAiLoading(true);
    try {
      const res = await evaluateRegistrationCandidate({
        data: {
          eventName: activeEvent.name || "Event",
          eventDescription: activeEvent.description || "",
          registrationData: {
            name: at.name || "Attendee",
            email: at.email || "",
            phone: at.phone || "",
            ...(at.form_responses || {})
          }
        }
      });
      if (res.success && res.evaluation) {
        toast.success(`Evaluated ${at.name}: Score ${res.evaluation.score}/100`);
        await supabase
          .from("event_registrations")
          .update({
            ai_score: res.evaluation.score,
            ai_recommendation: res.evaluation.recommendation,
            ai_reasoning: res.evaluation
          })
          .eq("id", at.id);
        onRefresh?.();
        if (viewAttendee && viewAttendee.id === at.id) {
          setViewAttendee({
            ...viewAttendee,
            ai_score: res.evaluation.score,
            ai_recommendation: res.evaluation.recommendation,
            ai_reasoning: res.evaluation
          });
        }
      }
    } catch (err: any) {
      toast.error("AI evaluation failed: " + err.message);
    } finally {
      setSingleAiLoading(false);
    }
  };

  // Handle Batch Shortlist with Gemini
  const handleGenerateShortlist = async () => {
    if (safeAttendees.length === 0 || !activeEvent?.name) {
      toast.error("No attendees available for shortlisting.");
      return;
    }
    setAiAnalyzing(true);
    try {
      const candidateList = safeAttendees.map((a) => ({
        id: a?.id || "",
        name: a?.name || "Attendee",
        email: a?.email || "",
        form_data: a?.form_responses || {}
      }));

      const res = await generateEventAIShortlist({
        data: {
          eventName: activeEvent.name,
          eventDescription: activeEvent.description || "",
          candidates: candidateList,
          topCount: aiShortlistCount
        }
      });

      if (res.success && res.result) {
        setAiShortlistResult(res.result);
        toast.success(`Generated AI Shortlist of Top ${res.result.top_candidates?.length || 0} Candidates!`);
      }
    } catch (err: any) {
      toast.error("Shortlist generation failed: " + err.message);
    } finally {
      setAiAnalyzing(false);
    }
  };


  const totalPages = Math.max(1, Math.ceil(filteredAttendees.length / PAGE_SIZE));
  const pagedAttendees = filteredAttendees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [statusTab, searchQuery, filterPayment]);

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === pagedAttendees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pagedAttendees.map((a) => a.id)));
    }
  };

  // Actions
  const handleApprove = async (at: any) => {
    setActionLoading(at.id);
    try {
      await approveRegistration({ data: { registrationId: at.id, eventId: activeEvent.id, workspaceId: activeEvent.workspace_id } });
      toast.success(`${at.name} approved!`);
      onRefresh();
      void emitActivity({ data: { actor: "EventAI", text: `Approved attendee: ${at.name}` } });
    } catch (err: any) {
      toast.error(err.message || "Approval failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectAttendee) return;
    setActionLoading(rejectAttendee.id);
    try {
      await rejectRegistration({ data: { registrationId: rejectAttendee.id, eventId: activeEvent.id, workspaceId: activeEvent.workspace_id, reason: rejectReason } });
      toast.success(`${rejectAttendee.name} rejected.`);
      setRejectOpen(false);
      setRejectReason("");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Rejection failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!attendeeToDelete) return;
    setActionLoading(attendeeToDelete.id);
    try {
      await deleteRegistration({ data: { registrationId: attendeeToDelete.id, eventId: activeEvent.id, workspaceId: activeEvent.workspace_id } });
      toast.success(`${attendeeToDelete.name} deleted.`);
      setDeleteConfirmOpen(false);
      setAttendeeToDelete(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckIn = async (at: any) => {
    setActionLoading(at.id);
    try {
      await checkInAttendee({ data: { registrationId: at.id, eventId: activeEvent.id, workspaceId: activeEvent.workspace_id } });
      toast.success(`${at.name} checked in!`);
      onRefresh();
      void emitActivity({ data: { actor: "EventAI", text: `${at.name} checked in via Operator Board` } });
    } catch (err: any) {
      toast.error(err.message || "Check-in failed");
    } finally {
      setActionLoading(null);
    }
  };

  // Real Camera Scanner State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment");
  const [torchOn, setTorchOn] = useState(false);
  const [cameraPaused, setCameraPaused] = useState(false);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "real-html5-qr-reader";

  // Audio feedback synthesizer (No external audio file required)
  const playBeepSound = (type: "success" | "error" | "warning") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "success") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === "warning") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(349.23, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(150, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      // Audio context fallback
    }
  };

  // Stop camera helper
  const stopCameraStream = async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
        html5QrcodeRef.current.clear();
      } catch (e) {
        console.warn("Camera stop warning:", e);
      } finally {
        html5QrcodeRef.current = null;
        setCameraActive(false);
        setCameraPaused(false);
        setTorchOn(false);
      }
    }
  };

  // Start Camera Stream
  const startCameraStream = async (facingMode = cameraFacingMode) => {
    try {
      await stopCameraStream();
      setScanResult(null);

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      html5QrcodeRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0
      };

      await html5QrCode.start(
        { facingMode },
        config,
        async (decodedText) => {
          // Pause camera immediately on scan
          try {
            await html5QrCode.pause(true);
            setCameraPaused(true);
          } catch (e) {}

          handleVerifyQRScan(decodedText);
        },
        () => {
          // Continuous frame scanning callback
        }
      );
      setCameraActive(true);
    } catch (err: any) {
      console.error("Camera start failed:", err);
      toast.error("Camera permission denied or camera unavailable: " + (err.message || err));
      setCameraActive(false);
    }
  };

  // Switch camera front / back
  const toggleCameraFacingMode = () => {
    const nextMode = cameraFacingMode === "environment" ? "user" : "environment";
    setCameraFacingMode(nextMode);
    if (scannerOpen) {
      void startCameraStream(nextMode);
    }
  };

  // Toggle Torch/Flashlight if supported
  const toggleTorch = async () => {
    if (!html5QrcodeRef.current || !cameraActive) return;
    try {
      const nextTorch = !torchOn;
      await html5QrcodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any]
      });
      setTorchOn(nextTorch);
      toast.success(nextTorch ? "Flashlight turned ON" : "Flashlight turned OFF");
    } catch (e) {
      toast.error("Flashlight not supported on this camera device.");
    }
  };

  // Manage scanner lifecycle with scannerOpen state
  useEffect(() => {
    if (scannerOpen) {
      const timer = setTimeout(() => {
        void startCameraStream(cameraFacingMode);
      }, 300);
      return () => {
        clearTimeout(timer);
        void stopCameraStream();
      };
    } else {
      void stopCameraStream();
    }
  }, [scannerOpen]);

  const handleVerifyQRScan = async (overrideValue?: string) => {
    const code = (overrideValue || qrInputValue).trim();
    if (!code) {
      toast.error("Please enter or scan a valid QR ticket code.");
      return;
    }
    setScanning(true);
    setScanResult(null);
    try {
      const res = await checkInAttendeeByQR({
        data: {
          qrPayload: code,
          eventId: activeEvent.id,
          workspaceId: activeEvent.workspace_id
        }
      });
      setScanResult(res);

      if (res.status === "VALID") {
        // Trigger haptic vibration on mobile
        if (navigator.vibrate) {
          try { navigator.vibrate([100, 50, 100]); } catch (e) {}
        }
        playBeepSound("success");
        // Confetti celebration animation
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch (e) {}

        toast.success(`✓ Checked In: ${res.attendee.name}`);
        onRefresh();
        void emitActivity({ data: { actor: "EventAI Real-time Scanner", text: `${res.attendee.name} checked in via camera scan` } });
      } else if (res.status === "ALREADY_CHECKED_IN") {
        if (navigator.vibrate) {
          try { navigator.vibrate([200]); } catch (e) {}
        }
        playBeepSound("warning");
        toast.info(res.message);
      } else {
        if (navigator.vibrate) {
          try { navigator.vibrate([300, 100, 300]); } catch (e) {}
        }
        playBeepSound("error");
        toast.error(res.message);
      }
      setQrInputValue("");
    } catch (err: any) {
      playBeepSound("error");
      toast.error(err.message || "QR Verification failed");
      setScanResult({ status: "INVALID", message: err.message || "Invalid or unverified ticket QR code." });
    } finally {
      setScanning(false);
    }
  };


  const handleSaveNotes = async () => {
    if (!viewAttendee) return;
    setNotesSaving(true);
    try {
      await updateRegistrationNotes({ data: { registrationId: viewAttendee.id, eventId: activeEvent.id, workspaceId: activeEvent.workspace_id, notes: notesValue } });
      toast.success("Notes saved.");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save notes");
    } finally {
      setNotesSaving(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editAttendee || !editName.trim()) return;
    setActionLoading(editAttendee.id);
    try {
      await updateRegistrationDetails({ data: { registrationId: editAttendee.id, eventId: activeEvent.id, workspaceId: activeEvent.workspace_id, name: editName.trim(), email: editEmail || null, phone: editPhone || null } });
      toast.success("Details updated.");
      setEditOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setActionLoading(null);
    }
  };

  // Bulk actions
  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setActionLoading("bulk");
    try {
      await bulkApproveRegistrations({ data: { registrationIds: [...selectedIds], eventId: activeEvent.id, workspaceId: activeEvent.workspace_id } });
      toast.success(`${selectedIds.size} attendees approved!`);
      setSelectedIds(new Set());
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Bulk approval failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkRejectConfirm = async () => {
    if (selectedIds.size === 0) return;
    setActionLoading("bulk");
    try {
      await bulkRejectRegistrations({ data: { registrationIds: [...selectedIds], eventId: activeEvent.id, workspaceId: activeEvent.workspace_id, reason: bulkRejectReason } });
      toast.success(`${selectedIds.size} attendees rejected.`);
      setSelectedIds(new Set());
      setBulkRejectOpen(false);
      setBulkRejectReason("");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Bulk rejection failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setActionLoading("bulk");
    try {
      await bulkDeleteRegistrations({ data: { registrationIds: [...selectedIds], eventId: activeEvent.id, workspaceId: activeEvent.workspace_id } });
      toast.success(`${selectedIds.size} attendees deleted.`);
      setSelectedIds(new Set());
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Bulk delete failed");
    } finally {
      setActionLoading(null);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const rows = filteredAttendees.map((a) => {
      const responses = a.form_responses || {};
      return {
        Name: a.name,
        Email: a.email || "",
        Phone: a.phone || "",
        Status: a.status || "Pending",
        "Check-in": a.checked_in ? "Yes" : "No",
        "Ticket Type": a.event_tickets?.name || "",
        "Payment Status": a.payment_status || "free",
        "Registered At": a.created_at ? new Date(a.created_at).toLocaleString() : "",
        Notes: a.notes || "",
        ...responses
      };
    });
    if (rows.length === 0) { toast.error("No data to export."); return; }
    const headers = Object.keys(rows[0]!);
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => `"${String((r as any)[h] || "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeEvent.name}-attendees.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exported!");
  };

  // Charts data
  const statusChartData = [
    { name: "Pending", value: pendingCount },
    { name: "Approved", value: approvedCount },
    { name: "Rejected", value: rejectedCount },
    { name: "Checked-in", value: checkedInCount }
  ].filter((d) => d.value > 0);

  const dailyData = useMemo(() => {
    const map: Record<string, number> = {};
    safeAttendees.forEach((a: any) => {
      const day = a?.created_at ? new Date(a.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Unknown";
      map[day] = (map[day] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).slice(-14);
  }, [safeAttendees]);


  const openDrawer = (at: any) => {
    setViewAttendee(at);
    setNotesValue(at.notes || "");
    setDrawerOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending": return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 text-[10px]">Pending</Badge>;
      case "Approved": return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-[10px]">Approved</Badge>;
      case "Rejected": return <Badge className="bg-red-500/15 text-red-400 border-red-500/25 text-[10px]">Rejected</Badge>;
      case "Checked-in": return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/25 text-[10px]">Checked-in</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total", value: attendees.length, color: "text-foreground", bg: "bg-secondary/30" },
          { label: "Pending", value: pendingCount, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Approved", value: approvedCount, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Rejected", value: rejectedCount, color: "text-red-400", bg: "bg-red-500/10" },
          { label: "Checked-in", value: checkedInCount, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Attendance", value: `${attendanceRate}%`, color: "text-purple-400", bg: "bg-purple-500/10" }
        ].map((stat) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`panel p-3 rounded-xl ${stat.bg} text-center`}>
            <span className={`block text-xl font-bold ${stat.color}`}>{stat.value}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="panel p-4 rounded-xl bg-secondary/10">
          <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase">Approval Status</h4>
          {statusChartData.length === 0 ? (
            <div className="text-xs text-center text-muted-foreground py-8">No data</div>
          ) : (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusChartData} cx="50%" cy="50%" outerRadius={65} innerRadius={30} fill="#8884d8" dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                    {statusChartData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="panel p-4 rounded-xl bg-secondary/10">
          <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase">Registrations Per Day</h4>
          {dailyData.length === 0 ? (
            <div className="text-xs text-center text-muted-foreground py-8">No data</div>
          ) : (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <XAxis dataKey="name" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "transparent" }} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Status Tabs + Search + Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 flex items-center gap-2 overflow-x-auto">
          {[
            { key: "all", label: "All", count: attendees.length },
            { key: "Pending", label: "Pending", count: pendingCount },
            { key: "Approved", label: "Approved", count: approvedCount },
            { key: "Rejected", label: "Rejected", count: rejectedCount },
            { key: "checked-in", label: "Checked-in", count: checkedInCount }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                statusTab === tab.key
                  ? "bg-primary text-white border-primary"
                  : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary/60"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs w-52"
            />
          </div>
          <Button 
            size="sm" 
            className="h-8 gap-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 text-xs font-bold shadow-lg shadow-amber-500/10"
            onClick={() => { setAiShortlistResult(null); setAiShortlistOpen(true); }}
          >
            <Sparkles className="size-3.5 fill-current" /> Ask EngageAI
          </Button>

          <Button 
            size="sm" 
            className="h-8 gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow"
            onClick={() => { setScanResult(null); setQrInputValue(""); setScannerOpen(true); }}
          >
            <QrCode className="size-3.5" /> Scan QR Check-in
          </Button>

          <select
            value={smartFilter}
            onChange={(e) => setSmartFilter(e.target.value)}
            className="h-8 rounded-lg border border-border bg-secondary px-2 text-xs text-foreground font-medium"
          >
            <option value="all">⚡ All Candidates</option>
            <option value="high_score">★ Recommended (High Score)</option>
            <option value="needs_review">⏳ Needs Review</option>
            <option value="missing_resume">⚠️ Missing Resume / Links</option>
          </select>

          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="h-8 rounded-lg border border-border bg-secondary px-2 text-xs text-foreground"
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid / Free</option>
          </select>

        </div>
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="panel p-3 rounded-xl bg-primary/5 border-primary/20 flex flex-wrap items-center gap-2"
          >
            <span className="text-xs font-semibold text-primary">{selectedIds.size} selected</span>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={handleBulkApprove} disabled={actionLoading === "bulk"}>
              <Check className="size-3" /> Bulk Approve
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => setBulkRejectOpen(true)} disabled={actionLoading === "bulk"}>
              <X className="size-3" /> Bulk Reject
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={handleBulkDelete} disabled={actionLoading === "bulk"}>
              <Trash2 className="size-3" /> Bulk Delete
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleExportCSV}>
              <Download className="size-3" /> Export CSV
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Table */}
      {filteredAttendees.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border/80 rounded-2xl bg-secondary/10 space-y-3 my-4">
          <div className="size-12 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center mx-auto text-white">
            <Users2 className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h4 className="text-sm font-bold text-foreground">
              {safeAttendees.length === 0 ? "No registrations yet" : "No matching attendees"}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {safeAttendees.length === 0
                ? "Share your registration link to receive attendees and automatically trigger AI candidate analysis."
                : "Try updating your search query, smart filter, or status tab."}
            </p>
          </div>
          {activeEvent?.slug && safeAttendees.length === 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5 border-white/10 hover:bg-white/[0.06]"
              onClick={() => {
                const url = typeof window !== "undefined" ? `${window.location.origin}/e/${activeEvent.slug}` : "";
                navigator.clipboard.writeText(url);
                toast.success("Public event link copied to clipboard!");
              }}
            >
              Copy Registration Link
            </Button>
          )}
        </div>
      ) : (

        <>
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30">
                  <TableHead className="w-10">
                    <Checkbox checked={selectedIds.size === pagedAttendees.length && pagedAttendees.length > 0} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                  <TableHead className="text-[10px]">Attendee</TableHead>
                  <TableHead className="text-[10px]">AI Score</TableHead>
                  <TableHead className="text-[10px]">AI Recommendation</TableHead>
                  <TableHead className="text-[10px]">Email</TableHead>
                  <TableHead className="text-[10px]">Mobile</TableHead>
                  <TableHead className="text-[10px]">Registered</TableHead>
                  <TableHead className="text-[10px]">Ticket</TableHead>
                  <TableHead className="text-[10px]">Status</TableHead>
                  <TableHead className="text-[10px]">Check-in</TableHead>
                  <TableHead className="text-[10px]">Payment</TableHead>
                  <TableHead className="text-right text-[10px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedAttendees.map((at) => {
                  const status = at.status || "Pending";
                  const score = at.ai_score || 0;
                  const rec = at.ai_recommendation || "Medium";
                  return (
                    <TableRow key={at.id} className={`group hover:bg-secondary/20 transition-colors ${selectedIds.has(at.id) ? "bg-primary/5" : ""}`}>
                      <TableCell>
                        <Checkbox checked={selectedIds.has(at.id)} onCheckedChange={() => toggleSelect(at.id)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className={`size-8 rounded-full flex items-center justify-center text-[10px] font-bold ${getInitialColor(at.name)}`}>
                            {getInitials(at.name)}
                          </div>
                          <span className="font-semibold text-xs truncate max-w-[120px]">{at.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] ${
                            score >= 80 ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" :
                            score >= 50 ? "bg-amber-500/15 text-amber-300 border-amber-500/30" :
                            "bg-white/[0.05] text-white/60 border-white/10"
                          }`}>
                            {score > 0 ? `${score}/100` : "Unrated"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${
                          rec === "High Potential" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          rec === "Low" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                          "bg-amber-500/10 text-amber-300 border-amber-500/20"
                        }`}>
                          {rec}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground truncate max-w-[130px]">{at.email || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{at.phone || "—"}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{at.created_at ? new Date(at.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{at.event_tickets?.name || "General"}</TableCell>
                      <TableCell>{getStatusBadge(status)}</TableCell>
                      <TableCell>
                        <Badge variant={at.checked_in ? "default" : "secondary"} className="text-[10px]">
                          {at.checked_in ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${at.payment_status === "paid" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-secondary text-muted-foreground"}`}>
                          {at.payment_status || "free"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          {status === "Pending" && (
                            <>
                              <Button size="icon" variant="ghost" className="size-7 text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleApprove(at)} disabled={actionLoading === at.id}>
                                <Check className="size-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="size-7 text-red-400 hover:bg-red-500/10" onClick={() => { setRejectAttendee(at); setRejectOpen(true); }} disabled={actionLoading === at.id}>
                                <X className="size-3.5" />
                              </Button>
                            </>
                          )}
                          {(status === "Approved") && !at.checked_in && (
                            <Button size="icon" variant="ghost" className="size-7 text-blue-400 hover:bg-blue-500/10" onClick={() => handleCheckIn(at)} disabled={actionLoading === at.id}>
                              <UserCheck className="size-3.5" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="size-7" onClick={() => openDrawer(at)}>
                            <Eye className="size-3.5" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="size-7"><MoreVertical className="size-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36 bg-popover border border-border p-1 rounded-md shadow-md">
                              <DropdownMenuItem onClick={() => { setEditAttendee(at); setEditName(at.name); setEditEmail(at.email || ""); setEditPhone(at.phone || ""); setEditOpen(true); }} className="flex items-center text-xs px-2 py-1.5 rounded hover:bg-secondary cursor-pointer">
                                <Edit className="size-3 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  if (!at.phone) { toast.error("No phone number available"); return; }
                                  const text = encodeURIComponent(`Hello ${at.name}, regarding your registration for ${activeEvent?.name || 'our event'}: https://engageai-gold.vercel.app/ticket/${at.ticket_token}`);
                                  window.open(`https://wa.me/${at.phone.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
                                }}
                                className="flex items-center text-xs px-2 py-1.5 rounded hover:bg-secondary cursor-pointer"
                              >
                                <MessageSquare className="size-3 mr-2 text-emerald-400" /> Send WhatsApp
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  if (!at.email) { toast.error("No email address available"); return; }
                                  window.open(`mailto:${at.email}?subject=${encodeURIComponent(activeEvent?.name || 'Event Ticket Pass')}&body=${encodeURIComponent(`Hello ${at.name},\n\nYour event pass status: ${at.status || 'Pending'}.\nTicket Link: https://engageai-gold.vercel.app/ticket/${at.ticket_token}`)}`, '_blank');
                                }}
                                className="flex items-center text-xs px-2 py-1.5 rounded hover:bg-secondary cursor-pointer"
                              >
                                <Mail className="size-3 mr-2 text-blue-400" /> Send Email
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setAttendeeToDelete(at); setDeleteConfirmOpen(true); }} className="flex items-center text-xs px-2 py-1.5 rounded text-destructive hover:bg-destructive/10 cursor-pointer">
                                <Trash2 className="size-3 mr-2" /> Delete
                              </DropdownMenuItem>

                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[10px] text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredAttendees.length)} of {filteredAttendees.length}
            </span>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="size-7" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="text-xs font-medium px-2">{page} / {totalPages}</span>
              <Button size="icon" variant="ghost" className="size-7" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Export button at bottom */}
          <div className="flex justify-end">
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleExportCSV}>
              <Download className="size-3.5" /> Export All ({filteredAttendees.length})
            </Button>
          </div>
        </>
      )}

      {/* ====================== DIALOGS ====================== */}

      {/* View Details Drawer (Right Sheet) */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-background border-border">
          <SheetHeader>
            <SheetTitle className="text-base">Attendee Details</SheetTitle>
            <SheetDescription className="text-xs">View full registration data, timeline, and notes.</SheetDescription>
          </SheetHeader>
          {viewAttendee && (
            <div className="mt-4 space-y-5 pb-8">
              {/* Profile header */}
              <div className="flex items-center gap-3">
                <div className={`size-12 rounded-full flex items-center justify-center text-sm font-bold ${getInitialColor(viewAttendee.name)}`}>
                  {getInitials(viewAttendee.name)}
                </div>
                <div>
                  <h3 className="font-bold text-sm">{viewAttendee.name}</h3>
                  <p className="text-xs text-muted-foreground">{viewAttendee.email || "No email"}</p>
                  {getStatusBadge(viewAttendee.status || "Pending")}
                </div>
              </div>

              {/* AI Score & Rationale Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                    <Sparkles className="size-3.5 text-amber-400" />
                    <span>Gemini AI Evaluation</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] gap-1 text-indigo-300 hover:bg-indigo-500/20"
                    onClick={() => handleSingleAiEvaluate(viewAttendee)}
                    disabled={singleAiLoading}
                  >
                    {singleAiLoading ? <Loader2 className="size-3 animate-spin" /> : <Brain className="size-3" />} Re-evaluate
                  </Button>
                </div>

                {viewAttendee.ai_score > 0 ? (
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-zinc-400">Score Rating:</span>
                      <span className="text-emerald-400 font-mono font-bold text-sm">{viewAttendee.ai_score}/100</span>
                    </div>
                    {viewAttendee.ai_reasoning?.reasoning && (
                      <p className="text-[11px] text-zinc-300 italic leading-relaxed">
                        "{viewAttendee.ai_reasoning.reasoning}"
                      </p>
                    )}
                    {Array.isArray(viewAttendee.ai_reasoning?.strengths) && viewAttendee.ai_reasoning.strengths.length > 0 && (
                      <div className="space-y-0.5 pt-1">
                        <span className="text-[10px] text-emerald-400 font-semibold block">Key Strengths</span>
                        <ul className="list-disc list-inside text-[10px] text-zinc-300 space-y-0.5">
                          {viewAttendee.ai_reasoning.strengths.map((str: string, i: number) => (
                            <li key={i}>{str}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-2 space-y-1">
                    <p className="text-[11px] text-zinc-400">Click below to run automated Gemini AI candidate scoring.</p>
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                      onClick={() => handleSingleAiEvaluate(viewAttendee)}
                      disabled={singleAiLoading}
                    >
                      {singleAiLoading ? <Loader2 className="size-3 animate-spin mr-1" /> : <Sparkles className="size-3 mr-1" />} Evaluate Candidate
                    </Button>
                  </div>
                )}
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Phone", value: viewAttendee.phone },
                  { label: "Payment", value: viewAttendee.payment_status || "free" },
                  { label: "Ticket Type", value: viewAttendee.event_tickets?.name || "General" },
                  { label: "Registered", value: viewAttendee.created_at ? new Date(viewAttendee.created_at).toLocaleString() : "—" },
                  { label: "IP Address", value: viewAttendee.ip_address },
                  { label: "Device", value: viewAttendee.device ? (viewAttendee.device.length > 40 ? viewAttendee.device.slice(0, 40) + "…" : viewAttendee.device) : null }
                ].map((item) => (
                  <div key={item.label} className="panel p-2 rounded-lg bg-secondary/20">
                    <span className="text-[9px] text-muted-foreground uppercase font-semibold block">{item.label}</span>
                    <span className="text-xs font-medium block mt-0.5 truncate">{item.value || "—"}</span>
                  </div>
                ))}
              </div>

              {/* Portfolio & Social Link Badges */}
              {viewAttendee.form_responses && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {(viewAttendee.form_responses.github || viewAttendee.form_responses.GitHub) && (
                    <a
                      href={String(viewAttendee.form_responses.github || viewAttendee.form_responses.GitHub)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/10 hover:bg-white/10 text-xs font-medium text-white inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Globe className="size-3 text-indigo-400" /> GitHub Profile
                    </a>
                  )}
                  {(viewAttendee.form_responses.linkedin || viewAttendee.form_responses.LinkedIn) && (
                    <a
                      href={String(viewAttendee.form_responses.linkedin || viewAttendee.form_responses.LinkedIn)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-xs font-medium text-blue-300 inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Globe className="size-3 text-blue-400" /> LinkedIn
                    </a>
                  )}
                  {(viewAttendee.form_responses.portfolio || viewAttendee.form_responses.Portfolio) && (
                    <a
                      href={String(viewAttendee.form_responses.portfolio || viewAttendee.form_responses.Portfolio)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 text-xs font-medium text-purple-300 inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Globe className="size-3 text-purple-400" /> Portfolio Website
                    </a>
                  )}
                  {(viewAttendee.form_responses.resume || viewAttendee.form_responses.Resume) && (
                    <a
                      href={String(viewAttendee.form_responses.resume || viewAttendee.form_responses.Resume)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs font-medium text-emerald-300 inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="size-3 text-emerald-400" /> View Resume
                    </a>
                  )}
                </div>
              )}

              {/* Custom Form Answers */}
              {viewAttendee.form_responses && Object.keys(viewAttendee.form_responses).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">Form Responses</h4>
                  <div className="space-y-1.5">
                    {Object.entries(viewAttendee.form_responses).map(([key, val]) => (
                      <div key={key} className="flex items-start gap-2 text-xs">
                        <span className="text-muted-foreground font-medium min-w-[80px] capitalize">{key}:</span>
                        <span className="text-foreground break-all">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* Rejection reason */}
              {viewAttendee.rejection_reason && (
                <div className="panel p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <span className="text-[9px] text-red-400 uppercase font-semibold block">Rejection Reason</span>
                  <span className="text-xs text-red-300 mt-1 block">{viewAttendee.rejection_reason}</span>
                </div>
              )}

              {/* QR Ticket */}
              {viewAttendee.ticket_token && (viewAttendee.status === "Approved" || viewAttendee.status === "Checked-in") && (
                <div className="flex flex-col items-center p-4 bg-white rounded-xl border shadow-sm">
                  <QRCodeSVG value={viewAttendee.ticket_token} size={120} level="H" includeMargin />
                  <span className="text-[10px] text-muted-foreground font-mono mt-2 select-all">{viewAttendee.ticket_token}</span>
                </div>
              )}

              {/* Activity Timeline */}
              {Array.isArray(viewAttendee.activity_history) && viewAttendee.activity_history.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">Activity Timeline</h4>
                  <div className="space-y-0 border-l-2 border-border/50 ml-2 pl-4">
                    {viewAttendee.activity_history.map((item: any, idx: number) => (
                      <div key={idx} className="relative pb-3">
                        <div className="absolute -left-[22px] top-0.5 size-3 rounded-full bg-primary border-2 border-background" />
                        <p className="text-xs font-semibold">{item.activity}</p>
                        <p className="text-[10px] text-muted-foreground">{item.details}</p>
                        <p className="text-[9px] text-muted-foreground/60 mt-0.5">{item.timestamp ? new Date(item.timestamp).toLocaleString() : ""}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Internal Notes */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <StickyNote className="size-3" /> Internal Notes
                </h4>
                <Textarea
                  placeholder="VIP Guest, Speaker, Special Food, Volunteer..."
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  className="text-xs min-h-[80px]"
                />
                <Button size="sm" className="w-full text-xs" onClick={handleSaveNotes} disabled={notesSaving}>
                  {notesSaving ? "Saving..." : "Save Notes"}
                </Button>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 pt-2 border-t border-border/50">
                {(viewAttendee.status || "Pending") === "Pending" && (
                  <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => { handleApprove(viewAttendee); setDrawerOpen(false); }}>
                    <Check className="size-3" /> Approve
                  </Button>
                )}
                {(viewAttendee.status === "Approved") && !viewAttendee.checked_in && (
                  <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 text-blue-400 border-blue-500/30 hover:bg-blue-500/10" onClick={() => { handleCheckIn(viewAttendee); setDrawerOpen(false); }}>
                    <UserCheck className="size-3" /> Check In
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Ask EngageAI Shortlist Dialog */}
      <Dialog open={aiShortlistOpen} onOpenChange={setAiShortlistOpen}>
        <DialogContent className="sm:max-w-lg bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Sparkles className="size-4 text-amber-400" />
              Ask EngageAI — Smart Registration Shortlist
            </DialogTitle>
            <DialogDescription className="text-xs">
              Gemini AI will analyze all submitted candidate profiles, GitHub links, portfolios, and responses to recommend the best registrations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Select Target Count:</span>
              <div className="flex gap-1.5">
                {[10, 25, 50].map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => setAiShortlistCount(cnt)}
                    className={`px-3 py-1 rounded-lg border text-xs font-bold transition-all ${
                      aiShortlistCount === cnt
                        ? "bg-amber-500 text-zinc-950 border-amber-500"
                        : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
                    }`}
                  >
                    Top {cnt}
                  </button>
                ))}
              </div>
            </div>

            {aiShortlistResult ? (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                  <span className="font-bold block mb-1">AI Committee Rationale</span>
                  <p className="text-[11px] leading-relaxed opacity-90">{aiShortlistResult.selection_rationale}</p>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-foreground">Top Selected Candidates ({aiShortlistResult.top_candidates?.length || 0})</span>
                  {aiShortlistResult.top_candidates?.map((cand: any, idx: number) => (
                    <div key={cand.id || idx} className="p-3 rounded-xl bg-secondary/30 border border-border/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{idx + 1}. {cand.name}</span>
                        <div className="flex items-center text-amber-400 text-xs">
                          {Array.from({ length: cand.stars || 5 }).map((_, i) => (
                            <Star key={i} className="size-3 fill-current" />
                          ))}
                        </div>
                      </div>
                      {Array.isArray(cand.bullets) && (
                        <ul className="list-disc list-inside text-[11px] text-muted-foreground space-y-0.5">
                          {cand.bullets.map((b: string, i: number) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center space-y-3 rounded-2xl bg-secondary/20 border border-dashed border-border">
                <Brain className="size-10 text-amber-400 mx-auto animate-pulse" />
                <h4 className="text-xs font-bold text-foreground">Ready to Shortlist Candidates</h4>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  EngageAI will parse all candidate experience, project ideas, and portfolio links to generate an automated recommendation cohort.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setAiShortlistOpen(false)}>Close</Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-bold hover:from-amber-400 hover:to-orange-400"
              onClick={handleGenerateShortlist}
              disabled={aiAnalyzing}
            >
              {aiAnalyzing ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Sparkles className="size-3.5 mr-1.5 fill-current" />}
              {aiAnalyzing ? "Analyzing Candidates..." : "Generate AI Shortlist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm bg-background border-border">
          <DialogHeader>
            <DialogTitle>Edit Attendee</DialogTitle>
            <DialogDescription>Modify attendee contact information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label className="text-xs">Full Name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Email</Label><Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={actionLoading !== null}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-sm bg-background border-border">
          <DialogHeader>
            <DialogTitle>Reject Registration</DialogTitle>
            <DialogDescription>Optionally provide a reason for rejection.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea placeholder="Reason for rejection (optional)..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="text-xs min-h-[60px]" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectOpen(false); setRejectReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleRejectConfirm} disabled={actionLoading !== null}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reject Dialog */}
      <Dialog open={bulkRejectOpen} onOpenChange={setBulkRejectOpen}>
        <DialogContent className="sm:max-w-sm bg-background border-border">
          <DialogHeader>
            <DialogTitle>Bulk Reject ({selectedIds.size})</DialogTitle>
            <DialogDescription>Optionally provide a common reason for rejection.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea placeholder="Common rejection reason (optional)..." value={bulkRejectReason} onChange={(e) => setBulkRejectReason(e.target.value)} className="text-xs min-h-[60px]" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBulkRejectOpen(false); setBulkRejectReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkRejectConfirm} disabled={actionLoading === "bulk"}>Reject All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attendee?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{attendeeToDelete?.name}" and all their registration data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground hover:bg-secondary">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR Check-in Real Camera Scanner Dialog */}
      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="sm:max-w-lg bg-background border-border max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Camera className="size-5 text-emerald-400 animate-pulse" />
                <span>Live Event AI Check-in Scanner</span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                HTML5 Camera Active
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Point camera at attendee QR pass or enter code below for instant server-side ticket verification.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Camera Control Action Toolbar */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/30 border border-border/60 text-xs">
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1 border-white/10"
                  onClick={toggleCameraFacingMode}
                  title="Switch Front/Back Camera"
                >
                  <SwitchCamera className="size-3.5 text-indigo-400" />
                  <span className="hidden sm:inline capitalize">{cameraFacingMode}</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={`h-8 text-xs gap-1 border-white/10 ${torchOn ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : ""}`}
                  onClick={toggleTorch}
                  title="Toggle Flashlight"
                >
                  <Flashlight className="size-3.5 text-amber-400" /> Flash
                </Button>
              </div>

              <div className="flex items-center gap-1.5">
                {cameraPaused ? (
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                    onClick={async () => {
                      if (html5QrcodeRef.current) {
                        try {
                          await html5QrcodeRef.current.resume();
                          setCameraPaused(false);
                          setScanResult(null);
                        } catch (e) {
                          void startCameraStream();
                        }
                      }
                    }}
                  >
                    <Play className="size-3.5" /> Resume Scan
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => void startCameraStream()}
                    title="Restart Camera"
                  >
                    <RefreshCw className="size-3.5" /> Reset Stream
                  </Button>
                )}
              </div>
            </div>

            {/* REAL HTML5 CAMERA CONTAINER */}
            <div className="relative rounded-2xl bg-zinc-950 border border-white/10 overflow-hidden shadow-2xl min-h-[260px] flex flex-col items-center justify-center">
              {/* HTML5 QR Code Mount Div */}
              <div id="real-html5-qr-reader" className="w-full overflow-hidden [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_video]:rounded-2xl" />

              {/* Scanning Overlay Animation Frame */}
              {!cameraPaused && cameraActive && (
                <div className="absolute inset-6 pointer-events-none border-2 border-dashed border-emerald-400/80 rounded-2xl animate-pulse flex items-center justify-center">
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-shimmer" />
                </div>
              )}

              {/* Offline fallback message */}
              {!cameraActive && (
                <div className="p-8 text-center space-y-2 z-10">
                  <Camera className="size-10 text-muted-foreground mx-auto animate-bounce" />
                  <p className="text-xs font-semibold text-zinc-300">Initializing Camera Permission Stream...</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-white/10"
                    onClick={() => void startCameraStream()}
                  >
                    Grant Camera Access
                  </Button>
                </div>
              )}
            </div>

            {/* Manual Token Verification Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Paste TKT- token or JSON payload..."
                value={qrInputValue}
                onChange={(e) => setQrInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleVerifyQRScan(); }}
                className="text-xs font-mono"
              />
              <Button onClick={() => handleVerifyQRScan()} disabled={scanning} className="text-xs gap-1.5 min-w-[100px] bg-primary text-white">
                {scanning ? <Loader2 className="size-3.5 animate-spin" /> : "Verify Token"}
              </Button>
            </div>

            {/* Quick Ticket Simulation for Testing */}
            {safeAttendees.find((a: any) => a?.status === "Approved" && !a?.checked_in) && (
              <div className="pt-1 text-center">
                <button
                  onClick={() => {
                    const sample = safeAttendees.find((a: any) => a?.status === "Approved" && !a?.checked_in);
                    if (sample) {
                      const payload = JSON.stringify({
                        registrationId: sample.id,
                        attendeeId: sample.id,
                        eventId: sample.event_id,
                        ticketId: sample.ticket_type_id || "general",
                        token: sample.ticket_token,
                        checksum: btoa(`${sample.id}:${sample.event_id}:${sample.ticket_token}`).slice(0, 12)
                      });
                      setQrInputValue(payload);
                      handleVerifyQRScan(payload);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                >
                  ⚡ Test Next Approved Ticket Scan ({safeAttendees.find((a: any) => a?.status === "Approved" && !a?.checked_in)?.name})
                </button>
              </div>
            )}

            {/* SCAN RESULT FEEDBACK CARDS */}
            {scanResult && (
              <AnimatePresence mode="wait">
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 rounded-2xl border space-y-3 ${
                    scanResult.status === "VALID"
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200 shadow-xl shadow-emerald-500/10"
                      : scanResult.status === "ALREADY_CHECKED_IN"
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-200"
                      : scanResult.status === "PENDING"
                      ? "bg-purple-500/15 border-purple-500/40 text-purple-200"
                      : "bg-rose-500/15 border-rose-500/40 text-rose-200"
                  }`}
                >
                  {/* Status Banner */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {scanResult.status === "VALID" ? (
                        <div className="size-9 rounded-full bg-emerald-500/30 border border-emerald-400 flex items-center justify-center text-emerald-300">
                          <CheckCircle2 className="size-6 animate-pulse" />
                        </div>
                      ) : scanResult.status === "ALREADY_CHECKED_IN" ? (
                        <div className="size-9 rounded-full bg-amber-500/30 border border-amber-400 flex items-center justify-center text-amber-300">
                          <Clock className="size-6" />
                        </div>
                      ) : (
                        <div className="size-9 rounded-full bg-rose-500/30 border border-rose-400 flex items-center justify-center text-rose-300">
                          <XCircle className="size-6" />
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-bold tracking-wide">
                          {scanResult.status === "VALID"
                            ? "✓ Entry Approved — Checked In"
                            : scanResult.status === "ALREADY_CHECKED_IN"
                            ? "Already Checked In"
                            : scanResult.status === "PENDING"
                            ? "Pending Approval"
                            : scanResult.status === "REJECTED"
                            ? "Registration Declined"
                            : "Invalid Ticket QR"}
                        </h4>
                        <p className="text-xs opacity-90">{scanResult.message}</p>
                      </div>
                    </div>

                    <Badge variant="outline" className="text-[10px] font-mono uppercase">
                      {scanResult.status}
                    </Badge>
                  </div>

                  {/* Attendee Details Card */}
                  {scanResult.attendee && (
                    <div className="text-xs bg-zinc-950/60 p-3 rounded-xl border border-white/10 space-y-1.5 font-sans">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-muted-foreground">Attendee Name:</span>
                        <span className="text-foreground font-bold text-sm">{scanResult.attendee.name}</span>
                      </div>
                      {scanResult.attendee.email && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Email:</span>
                          <span className="text-zinc-300">{scanResult.attendee.email}</span>
                        </div>
                      )}
                      {scanResult.attendee.form_responses?.college && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Institution:</span>
                          <span className="text-zinc-300">{scanResult.attendee.form_responses.college}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between font-mono text-[10px] pt-1 border-t border-white/5">
                        <span className="text-muted-foreground">Ticket Token:</span>
                        <span className="text-indigo-300">{scanResult.attendee.ticket_token}</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between border-t border-border/40 pt-3">
            <span className="text-[10px] text-muted-foreground">Camera stops automatically when closing</span>
            <Button
              variant="outline"
              onClick={() => {
                void stopCameraStream();
                setScannerOpen(false);
              }}
              className="text-xs"
            >
              Close Scanner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

