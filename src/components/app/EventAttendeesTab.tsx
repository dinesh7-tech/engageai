import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users2,
  CheckCircle2,
  Clock,
  XCircle,
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
  Loader2,
  UserCheck,
  Filter
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

import { emitActivity } from "@/lib/realtime.functions";

const COLORS = ["#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6"];
const PAGE_SIZE = 15;

function getInitials(name: string) {
  return name
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
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

interface EventAttendeesTabProps {
  activeEvent: any;
  attendees: any[];
  ticketTiers: any[];
  onRefresh: () => void;
}

export function EventAttendeesTab({ activeEvent, attendees, ticketTiers, onRefresh }: EventAttendeesTabProps) {
  const [statusTab, setStatusTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPayment, setFilterPayment] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewAttendee, setViewAttendee] = useState<any>(null);
  const [notesValue, setNotesValue] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editAttendee, setEditAttendee] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // Reject dialog state
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectAttendee, setRejectAttendee] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Delete confirm state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [attendeeToDelete, setAttendeeToDelete] = useState<any>(null);

  // Bulk reject dialog
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");

  // Check-in QR Scanner state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [qrInputValue, setQrInputValue] = useState("");
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanning, setScanning] = useState(false);

  // Loading states
  const [actionLoading, setActionLoading] = useState<string | null>(null);


  // Counts
  const pendingCount = attendees.filter((a) => (a.status || "Pending") === "Pending").length;
  const approvedCount = attendees.filter((a) => a.status === "Approved").length;
  const rejectedCount = attendees.filter((a) => a.status === "Rejected").length;
  const checkedInCount = attendees.filter((a) => a.status === "Checked-in" || a.checked_in).length;
  const attendanceRate = attendees.length > 0 ? Math.round((checkedInCount / attendees.length) * 100) : 0;

  // Filtered and paginated attendees
  const filteredAttendees = useMemo(() => {
    let list = [...attendees];

    // Status filter
    if (statusTab !== "all") {
      if (statusTab === "checked-in") {
        list = list.filter((a) => a.status === "Checked-in" || a.checked_in);
      } else {
        list = list.filter((a) => (a.status || "Pending") === statusTab);
      }
    }

    // Payment filter
    if (filterPayment === "paid") {
      list = list.filter((a) => a.payment_status === "paid");
    } else if (filterPayment === "unpaid") {
      list = list.filter((a) => a.payment_status !== "paid");
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => {
        const responses = a.form_responses || {};
        const college = (responses.college || responses.College || "").toLowerCase();
        return (
          a.name?.toLowerCase().includes(q) ||
          a.email?.toLowerCase().includes(q) ||
          a.phone?.toLowerCase().includes(q) ||
          college.includes(q)
        );
      });
    }

    return list;
  }, [attendees, statusTab, filterPayment, searchQuery]);

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
      if (res.alreadyCheckedIn) {
        toast.info(`${res.attendee.name} was already checked in.`);
      } else {
        toast.success(`✓ Successfully Checked In: ${res.attendee.name}`);
        onRefresh();
        void emitActivity({ data: { actor: "EventAI Scanner", text: `${res.attendee.name} checked in via QR scan` } });
      }
      setQrInputValue("");
    } catch (err: any) {
      toast.error(err.message || "QR Verification failed");
      setScanResult({ error: err.message || "Invalid or unverified ticket QR code." });
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
    attendees.forEach((a) => {
      const day = a.created_at ? new Date(a.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Unknown";
      map[day] = (map[day] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).slice(-14);
  }, [attendees]);

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
            className="h-8 gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow"
            onClick={() => { setScanResult(null); setQrInputValue(""); setScannerOpen(true); }}
          >
            <QrCode className="size-3.5" /> Scan QR Check-in
          </Button>

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
        <div className="p-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
          {attendees.length === 0 ? "No registrations yet. Share the public link to acquire attendees." : "No attendees match your current filter criteria."}
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

      {/* QR Check-in Scanner Dialog */}
      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="sm:max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <QrCode className="size-5 text-primary" /> Event Scanner & Check-in Verification
            </DialogTitle>
            <DialogDescription className="text-xs">
              Scan or enter an attendee's QR ticket token to verify approval and perform instant venue check-in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input
                placeholder="Scan QR or paste TKT- token..."
                value={qrInputValue}
                onChange={(e) => setQrInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleVerifyQRScan(); }}
                className="text-xs font-mono"
              />
              <Button onClick={() => handleVerifyQRScan()} disabled={scanning} className="text-xs gap-1.5 min-w-[100px]">
                {scanning ? <Loader2 className="size-3.5 animate-spin" /> : "Verify"}
              </Button>
            </div>

            {/* Simulated camera scanning frame */}
            <div className="relative h-44 rounded-2xl bg-zinc-950 border border-border flex flex-col items-center justify-center p-4 overflow-hidden">
              <div className="absolute inset-4 border-2 border-dashed border-primary/50 rounded-xl animate-pulse" />
              <QrCode className="size-12 text-primary/40 mb-2" />
              <p className="text-[11px] text-muted-foreground text-center">Camera scanner active. Position QR code within frame.</p>

              {attendees.find(a => a.status === "Approved" && !a.checked_in) && (
                <button
                  onClick={() => {
                    const sample = attendees.find(a => a.status === "Approved" && !a.checked_in);
                    if (sample) {
                      setQrInputValue(JSON.stringify({ event_id: sample.event_id, registration_id: sample.id, token: sample.ticket_token }));
                      handleVerifyQRScan(JSON.stringify({ event_id: sample.event_id, registration_id: sample.id, token: sample.ticket_token }));
                    }
                  }}
                  className="mt-3 px-2.5 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 text-[10px] font-semibold transition-colors z-10"
                >
                  ⚡ Simulate Scan Next Approved Ticket
                </button>
              )}
            </div>

            {/* Scan Result Feedback */}
            {scanResult && (
              <div className={`p-4 rounded-xl border space-y-2 ${
                scanResult.error 
                  ? "bg-red-500/10 border-red-500/30 text-red-300"
                  : scanResult.alreadyCheckedIn
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 animate-in fade-in"
              }`}>
                {scanResult.error ? (
                  <div className="flex items-center gap-2">
                    <XCircle className="size-5 text-red-400" />
                    <div>
                      <h4 className="text-xs font-bold text-red-300">Check-in Failed</h4>
                      <p className="text-[11px] text-red-200">{scanResult.error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-5 text-emerald-400" />
                      <h4 className="text-xs font-bold text-emerald-300">
                        {scanResult.alreadyCheckedIn ? "Already Checked In" : "✓ Successfully Checked In"}
                      </h4>
                    </div>
                    <div className="text-xs text-foreground bg-background/40 p-2.5 rounded-lg border border-border/40 mt-2 space-y-1">
                      <p><span className="text-muted-foreground font-semibold">Attendee:</span> {scanResult.attendee.name}</p>
                      <p><span className="text-muted-foreground font-semibold">Email:</span> {scanResult.attendee.email || "—"}</p>
                      <p><span className="text-muted-foreground font-semibold">Ticket Token:</span> <span className="font-mono text-[10px]">{scanResult.attendee.ticket_token}</span></p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setScannerOpen(false)} className="text-xs">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

