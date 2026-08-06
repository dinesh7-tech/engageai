import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Award, 
  CalendarPlus, 
  CheckCircle2, 
  QrCode, 
  Star, 
  Users2, 
  Plus, 
  Clock, 
  Settings, 
  Activity as ActIcon, 
  Sparkles, 
  FileText, 
  Mail, 
  Wand2, 
  GraduationCap, 
  Briefcase, 
  Cpu, 
  Heart, 
  Trophy, 
  Music, 
  Users, 
  Trash2, 
  ChevronRight, 
  Copy,
  PieChart as PieIcon,
  Globe,
  Loader2,
  MoreVertical,
  Edit,
  Archive,
  Link2
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { ChartCard } from "@/components/app/ChartCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { QRCodeSVG } from "qrcode.react";
import { useActiveWorkspace } from "@/hooks/useActiveWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { createEvent, publishEvent, checkInAttendee, fetchEventAnalytics, registerAttendee, deleteEvent, duplicateEvent, updateEventDetails } from "@/lib/event.functions";
import { builtInCategories, type CategoryPreset, type TemplatePreset } from "@/lib/event-templates";
import { emitActivity } from "@/lib/realtime.functions";
import { EventAttendeesTab } from "@/components/app/EventAttendeesTab";
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

export const Route = createFileRoute("/app/eventai")({
  component: EventAIPage,
});

// Category Icons mapper helper
const getCategoryIcon = (iconName: string) => {
  switch (iconName) {
    case "GraduationCap": return GraduationCap;
    case "Briefcase": return Briefcase;
    case "Cpu": return Cpu;
    case "Heart": return Heart;
    case "Activity": return ActIcon;
    case "Trophy": return Trophy;
    case "Music": return Music;
    case "Users": return Users;
    default: return Sparkles;
  }
};

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#f43f5e"];

function EventAIPage() {
  const { activeWorkspace, loading: wsLoading } = useActiveWorkspace();
  const workspaceId = activeWorkspace?.id;

  const [events, setEvents] = useState<any[]>([]);
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [customCategories, setCustomCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Wizard state machine
  const [createOpen, setCreateOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<"category" | "template" | "customize">("category");
  const [selectedCat, setSelectedCat] = useState<CategoryPreset | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplatePreset | null>(null);

  // Event form customization parameters
  const [eventName, setEventName] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [regType, setRegType] = useState<"unlimited" | "capacity">("unlimited");
  const [capLimit, setCapLimit] = useState<number>(100);
  const [approvalMode, setApprovalMode] = useState<"auto" | "manual">("auto");
  const [eventTheme, setEventTheme] = useState("Professional");

  // Custom category creator dialog
  const [customOpen, setCustomOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catIcon, setCatIcon] = useState("Sparkles");
  const [catColor, setCatColor] = useState("#8b5cf6");

  // Manual register form
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regOpen, setRegOpen] = useState(false);

  // AI Prompt Helper State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  // Edit dialog state variables
  const [editOpen, setEditOpen] = useState(false);
  const [editEventData, setEditEventData] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editRegType, setEditRegType] = useState<"unlimited" | "capacity">("unlimited");
  const [editCapLimit, setEditCapLimit] = useState<number>(100);
  const [editApprovalMode, setEditApprovalMode] = useState<"auto" | "manual">("auto");
  const [editTheme, setEditTheme] = useState("Professional");

  // Delete event confirmation dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<any>(null);

  // QR Code preview dialog
  const [qrOpen, setQrOpen] = useState(false);
  const [qrEvent, setQrEvent] = useState<any>(null);

  // Active event sub-panel lists
  const [formFields, setFormFields] = useState<any[]>([]);
  const [ticketTiers, setTicketTiers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({ views: 0, qrScans: 0, registrations: 0, conversionRate: 0, sources: [], devices: [] });
  const [outboxMessages, setOutboxMessages] = useState<any[]>([]);

  // 1. Fetch Categories & Events
  const fetchCustomCategories = async () => {
    if (!workspaceId) return;
    const { data } = await (supabase as any)
      .from("event_categories")
      .select("*")
      .eq("workspace_id", workspaceId);
    setCustomCategories(data || []);
  };

  const fetchEvents = async () => {
    if (!workspaceId) return;
    setLoading(true);

    const { data: dbEvents, error } = await supabase
      .from("events")
      .select("*, event_categories(name)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load events");
      setLoading(false);
      return;
    }

    setEvents(dbEvents || []);
    if (dbEvents && dbEvents.length > 0 && !activeEvent) {
      setActiveEvent(dbEvents[0]);
    } else if (activeEvent) {
      const updated = dbEvents.find(e => e.id === activeEvent.id);
      if (updated) setActiveEvent(updated);
    }
    setLoading(false);
  };

  // 2. Fetch Active Event details (fields, tickets, analytics)
  const fetchActiveEventDetails = async () => {
    if (!activeEvent) return;

    // Fetch form fields
    const { data: fields } = await (supabase as any)
      .from("event_form_fields")
      .select("*")
      .eq("event_id", activeEvent.id)
      .order("sort_order", { ascending: true });
    setFormFields(fields || []);

    // Fetch ticket tiers
    const { data: tickets } = await (supabase as any)
      .from("event_tickets")
      .select("*")
      .eq("event_id", activeEvent.id);
    setTicketTiers(tickets || []);

    // Fetch attendees
    const { data: regs } = await supabase
      .from("event_registrations")
      .select("*, event_tickets(name)")
      .eq("event_id", activeEvent.id)
      .order("created_at", { ascending: false });
    setAttendees(regs || []);

    // Fetch analytics using server function
    try {
      const res = await fetchEventAnalytics({ data: { eventId: activeEvent.id, workspaceId: activeEvent.workspace_id } });
      setAnalytics(res);
    } catch (err) {
      console.error("Analytics fetch failed:", err);
    }

    // Fetch outbox messages linked to event
    const { data: msgs } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("workspace_id", activeEvent.workspace_id)
      .order("sent_at", { ascending: false })
      .limit(10);
    setOutboxMessages(msgs || []);
  };

  useEffect(() => {
    fetchEvents();
    fetchCustomCategories();
  }, [workspaceId]);

  useEffect(() => {
    fetchActiveEventDetails();
  }, [activeEvent]);

  // AI Assistant Prompt Resolver
  const handleAISuggest = () => {
    if (!aiPrompt.trim()) return;
    setAiAnalyzing(true);
    setTimeout(() => {
      const prompt = aiPrompt.toLowerCase();
      let matchedCat: CategoryPreset | null = null;
      let matchedTemplate: TemplatePreset | null = null;

      // Simple keywords matcher
      if (prompt.includes("hackathon") || prompt.includes("coding") || prompt.includes("developer")) {
        matchedCat = builtInCategories.find(c => c.name === "Education")!;
        matchedTemplate = matchedCat.subcategories.find(s => s.name === "Hackathon")!;
        setEventName("AI Hackathon 2026");
        setEventTheme("Hackathon");
      } else if (prompt.includes("wedding") || prompt.includes("reception") || prompt.includes("family")) {
        matchedCat = builtInCategories.find(c => c.name === "Wedding")!;
        matchedTemplate = matchedCat.subcategories.find(s => s.name === "Wedding Reception")!;
        setEventName("Family Celebration Wedding");
        setEventTheme("Wedding");
      } else if (prompt.includes("medical") || prompt.includes("clinic") || prompt.includes("camp") || prompt.includes("doctor")) {
        matchedCat = builtInCategories.find(c => c.name === "Healthcare")!;
        matchedTemplate = matchedCat.subcategories.find(s => s.name === "Medical Camp")!;
        setEventName("Community Wellness Camp");
        setEventTheme("Minimal");
      } else {
        matchedCat = builtInCategories.find(c => c.name === "Corporate")!;
        matchedTemplate = matchedCat.subcategories.find(s => s.name === "Conference")!;
        setEventName("Dynamic AI Summit");
        setEventTheme("Corporate");
      }

      setSelectedCat(matchedCat);
      setSelectedTemplate(matchedTemplate);
      setEventVenue("Grand Tech Center");
      setEventDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)); // 1 week in future
      setWizardStep("customize");
      setAiAnalyzing(false);
      toast.success("AI Event suggestions preloaded successfully!");
    }, 1200);
  };

  // Create Event using Server Functions
  const handleWizardSubmit = async (status: "draft" | "published") => {
    console.log("[Event Creation Flow] Step 1: Event Wizard submitted. Input:", { eventName, eventVenue, eventDate, regType, capLimit, approvalMode, eventTheme, status });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to create an event.");
      return;
    }

    if (!activeWorkspace) {
      toast.error("No active workspace found. Please select or create a workspace.");
      return;
    }
    console.log("[Event Creation Flow] Step 2: Workspace context resolved active workspace:", activeWorkspace);

    if (!workspaceId) {
      toast.error("Workspace ID is not available.");
      return;
    }

    if (status === "published") {
      if (!eventName.trim()) {
        toast.error("Event name is required to publish.");
        return;
      }
      if (!eventVenue.trim()) {
        toast.error("Venue address is required to publish.");
        return;
      }
      if (!eventDate) {
        toast.error("Date & Time is required to publish.");
        return;
      }
    } else {
      if (!eventName.trim()) {
        toast.error("Event name is required to save a draft.");
        return;
      }
    }

    try {
      const defaultFields = selectedTemplate?.default_form_fields || [
        { field_name: "name", field_label: "Full Name", field_type: "text", required: true },
        { field_name: "email", field_label: "Email Address", field_type: "email", required: true },
        { field_name: "phone", field_label: "WhatsApp Mobile", field_type: "tel", required: true }
      ];

      const defaultTickets = [
        { name: "General Admission", ticket_type: "free", price: 0.00 },
        ...(selectedTemplate?.name === "Hackathon" ? [{ name: "VIP Developer Access", ticket_type: "free", price: 0.00 }] : [])
      ];

      const ev = await createEvent({
        data: {
          workspaceId,
          name: eventName.trim(),
          venue: eventVenue || "To be announced",
          date: eventDate || undefined,
          categoryId: null, // Scoped custom reference if any
          subcategory: selectedTemplate?.name || "Custom Event",
          registrationType: regType,
          capacityLimit: regType === "capacity" ? capLimit : null,
          approvalMode,
          theme: eventTheme,
          landingPageSections: selectedTemplate?.default_landing_page?.sections || ["Banner", "About", "Registration"],
          defaultFields,
          defaultTickets,
          status
        }
      });

      toast.success(`Event "${ev.name}" successfully saved as ${status}.`);
      setCreateOpen(false);
      setWizardStep("category");
      setSelectedCat(null);
      setSelectedTemplate(null);
      setEventName("");
      setEventVenue("");
      setEventDate("");
      setAiPrompt("");
      fetchEvents();
      void emitActivity({ data: { actor: "EventAI", text: `Provisioned event: ${ev.name} (${status})` } });
    } catch (err: any) {
      toast.error(err.message || "Failed to create event");
    }
  };

  // Custom Category creation
  const handleCreateCustomCategory = async () => {
    if (!catName.trim() || !workspaceId) return;

    const { error } = await (supabase as any).from("event_categories").insert({
      workspace_id: workspaceId,
      name: catName.trim(),
      description: catDesc.trim(),
      icon: catIcon,
      color: catColor,
      default_form_fields: [
        { field_name: "name", field_label: "Full Name", field_type: "text", required: true },
        { field_name: "email", field_label: "Email Address", field_type: "email", required: true }
      ]
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Custom category "${catName.trim()}" created successfully!`);
      setCatName("");
      setCatDesc("");
      setCustomOpen(false);
      fetchCustomCategories();
    }
  };

  // Change Event status using server function
  const handleStatusChange = async (status: string) => {
    if (!activeEvent || !workspaceId) return;

    if (status === "published") {
      if (!activeEvent.name?.trim()) {
        toast.error("Event name is required to publish.");
        return;
      }
      if (!activeEvent.venue?.trim() || activeEvent.venue === "To be announced") {
        toast.error("Venue address is required to publish.");
        return;
      }
      if (!activeEvent.date) {
        toast.error("Date & Time is required to publish.");
        return;
      }
    }

    try {
      await publishEvent({ data: { eventId: activeEvent.id, workspaceId, status } });
      toast.success(`Event status changed to ${status}`);
      fetchEvents();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  // Operator check-in function
  const handleOperatorCheckIn = async (regId: string, name: string) => {
    if (!activeEvent) return;
    try {
      await checkInAttendee({
        data: {
          registrationId: regId,
          eventId: activeEvent.id,
          workspaceId: activeEvent.workspace_id
        }
      });
      toast.success(`${name} checked in successfully!`);
      fetchActiveEventDetails();
      void emitActivity({ data: { actor: "EventAI", text: `${name} checked in via Operator Board` } });
    } catch (err: any) {
      toast.error(err.message || "Check-in failed");
    }
  };

  // Helper handlers for Event Actions
  const handleQuickPublish = async (e: any) => {
    if (!e.name?.trim()) {
      toast.error("Event name is required to publish.");
      return;
    }
    if (!e.venue?.trim() || e.venue === "To be announced") {
      toast.error("Venue address is required to publish.");
      return;
    }
    if (!e.date) {
      toast.error("Date & Time is required to publish.");
      return;
    }

    try {
      await publishEvent({ data: { eventId: e.id, workspaceId: workspaceId!, status: "published" } });
      toast.success(`Event "${e.name}" published successfully!`);
      fetchEvents();
    } catch (err: any) {
      toast.error(err.message || "Failed to publish event.");
    }
  };

  const handleQuickUnpublish = async (e: any) => {
    try {
      await publishEvent({ data: { eventId: e.id, workspaceId: workspaceId!, status: "draft" } });
      toast.success(`Event "${e.name}" reverted to draft status.`);
      fetchEvents();
    } catch (err: any) {
      toast.error(err.message || "Failed to unpublish event.");
    }
  };

  const handleQuickArchive = async (e: any) => {
    try {
      await publishEvent({ data: { eventId: e.id, workspaceId: workspaceId!, status: "archived" } });
      toast.success(`Event "${e.name}" archived successfully.`);
      fetchEvents();
    } catch (err: any) {
      toast.error(err.message || "Failed to archive event.");
    }
  };

  const handleDuplicate = async (e: any) => {
    try {
      const newEv = await duplicateEvent({ data: { eventId: e.id, workspaceId: workspaceId! } });
      toast.success(`Event duplicated as "${newEv.name}" (Draft).`);
      fetchEvents();
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate event.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;
    try {
      await deleteEvent({ data: { eventId: eventToDelete.id, workspaceId: workspaceId! } });
      toast.success(`Event "${eventToDelete.name}" deleted successfully.`);
      setDeleteConfirmOpen(false);
      setEventToDelete(null);
      if (activeEvent?.id === eventToDelete.id) {
        setActiveEvent(null);
      }
      fetchEvents();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete event.");
    }
  };

  const handleEditSubmit = async () => {
    if (!editEventData) return;
    if (!editName.trim()) {
      toast.error("Event name is required.");
      return;
    }
    try {
      await updateEventDetails({
        data: {
          eventId: editEventData.id,
          workspaceId: workspaceId!,
          name: editName.trim(),
          venue: editVenue,
          date: editDate || "",
          registrationType: editRegType,
          capacityLimit: editRegType === "capacity" ? editCapLimit : null,
          approvalMode: editApprovalMode,
          theme: editTheme
        }
      });
      toast.success("Event details updated successfully!");
      setEditOpen(false);
      setEditEventData(null);
      fetchEvents();
    } catch (err: any) {
      toast.error(err.message || "Failed to update event.");
    }
  };

  const copyEventLink = (e: any) => {
    if (!e) return;
    const url = typeof window !== "undefined" ? `${window.location.origin}/e/${e.slug}` : `https://engageai-gold.vercel.app/e/${e.slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Registration link copied to clipboard!");
  };

  const copyLandingLink = () => {
    if (!activeEvent) return;
    const url = typeof window !== "undefined" ? `${window.location.origin}/e/${activeEvent.slug}` : `https://engageai-gold.vercel.app/e/${activeEvent.slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Event landing page link copied to clipboard!");
  };

  // Statistics summaries
  const totalRegistrations = events.reduce((acc, e) => acc + (e.registrations || 0), 0);
  const totalEvents = events.length;

  const categoriesList = [...builtInCategories, ...customCategories.map(c => ({
    name: c.name,
    icon: c.icon || "Sparkles",
    color: c.color || "#8b5cf6",
    description: c.description || "Workspace category",
    subcategories: [
      {
        name: c.name,
        description: c.description,
        theme: "Minimal",
        default_form_fields: c.default_form_fields || [],
        default_automation: { triggers: ["registration"], steps: [] },
        default_landing_page: { sections: ["Banner", "About", "Registration"], faq: [], agenda: [] }
      }
    ]
  }))];

  if (wsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="EventAI Manager"
        description="Transform event creations, pre-seed dynamic form fields, design themed landing pages, and analyze ticketing conversions."
        actions={
          <div className="flex items-center gap-2">
            <Dialog open={customOpen} onOpenChange={setCustomOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                  <Plus className="size-4" /> Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Create Custom Category</DialogTitle>
                  <DialogDescription>Define a workspace-private event category.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1">
                    <Label htmlFor="cat-name">Category Name</Label>
                    <Input id="cat-name" placeholder="E.g. VIP Reception" value={catName} onChange={e => setCatName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cat-desc">Description</Label>
                    <Textarea id="cat-desc" placeholder="Brief details about these events..." value={catDesc} onChange={e => setCatDesc(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="cat-icon">Icon</Label>
                      <select id="cat-icon" value={catIcon} onChange={e => setCatIcon(e.target.value)} className="w-full bg-secondary border border-border h-9 rounded px-2 text-sm text-foreground">
                        {["Sparkles", "GraduationCap", "Briefcase", "Cpu", "Heart", "Activity", "Trophy", "Music", "Users"].map(i => (
                          <option key={i} value={i}>{i}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cat-color">Color Accent</Label>
                      <Input id="cat-color" type="color" value={catColor} onChange={e => setCatColor(e.target.value)} className="h-9 p-0.5 border border-border bg-secondary" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateCustomCategory} className="w-full">Create Category</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Event Creation Wizard */}
            <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if(!open) setWizardStep("category"); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 bg-gradient-to-r from-primary to-indigo-600 hover:opacity-90">
                  <CalendarPlus className="size-4" /> Create Event
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Wand2 className="size-5 text-primary" /> Setup Event Wizard
                  </DialogTitle>
                  <DialogDescription>Seed categories, templates, and dynamic registration pages.</DialogDescription>
                </DialogHeader>

                {/* AI Assistant helper prompt */}
                {wizardStep === "category" && (
                  <div className="panel p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-2 mb-2">
                    <Label className="text-xs font-semibold flex items-center gap-1.5 text-primary">
                      <Sparkles className="size-3.5" /> AI Event Assistant
                    </Label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Type E.g. 'AI Hackathon for 200 developers'..." 
                        value={aiPrompt} 
                        onChange={e => setAiPrompt(e.target.value)}
                        className="h-9 text-xs"
                      />
                      <Button size="sm" onClick={handleAISuggest} disabled={aiAnalyzing} className="h-9 px-3 gap-1">
                        {aiAnalyzing ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />} Suggest
                      </Button>
                    </div>
                  </div>
                )}

                {wizardStep === "category" && (
                  <div className="space-y-4">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">1. Choose Category</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {categoriesList.map((cat, idx) => {
                        const Icon = getCategoryIcon(cat.icon);
                        return (
                          <button
                            key={idx}
                            onClick={() => { setSelectedCat(cat); setWizardStep("template"); }}
                            className="panel p-4 flex flex-col text-left hover:border-primary/50 hover:bg-secondary/40 transition-colors"
                          >
                            <span className="p-2 rounded-lg bg-secondary inline-block mb-2 max-w-fit" style={{ color: cat.color }}>
                              <Icon className="size-5" />
                            </span>
                            <span className="font-semibold text-sm block">{cat.name}</span>
                            <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{cat.description}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {wizardStep === "template" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">2. Choose Template</Label>
                      <Button variant="ghost" size="sm" onClick={() => setWizardStep("category")}>← Back</Button>
                    </div>
                    {selectedCat?.subcategories.length === 0 ? (
                      <div className="p-8 text-center text-xs text-muted-foreground panel">
                        No subcategory templates loaded for this category. Click customize to configure blank event.
                        <Button className="mt-4 w-full" onClick={() => { setSelectedTemplate(null); setWizardStep("customize"); }}>
                          Configure Custom Event
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedCat?.subcategories.map((sub, idx) => (
                          <button
                            key={idx}
                            onClick={() => { setSelectedTemplate(sub); setWizardStep("customize"); }}
                            className="w-full panel p-4 flex justify-between items-center text-left hover:border-primary/50 hover:bg-secondary/40 transition-colors"
                          >
                            <div>
                              <span className="font-semibold text-sm block">{sub.name}</span>
                              <span className="text-[11px] text-muted-foreground mt-0.5">{sub.description}</span>
                            </div>
                            <ChevronRight className="size-4 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {wizardStep === "customize" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">3. Customise Event Fields</Label>
                      <Button variant="ghost" size="sm" onClick={() => setWizardStep("template")}>← Back</Button>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="wiz-name">Event Name</Label>
                        <Input id="wiz-name" value={eventName} onChange={e => setEventName(e.target.value)} placeholder="AI Workshop 2026" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="wiz-venue">Venue Address</Label>
                        <Input id="wiz-venue" value={eventVenue} onChange={e => setEventVenue(e.target.value)} placeholder="Grand Tech Hall Ballroom" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="wiz-date">Date & Time</Label>
                        <Input id="wiz-date" type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="wiz-reg">Registration Type</Label>
                          <select id="wiz-reg" value={regType} onChange={e => setRegType(e.target.value as any)} className="w-full bg-secondary border border-border h-9 rounded px-2 text-sm text-foreground">
                            <option value="unlimited">Unlimited Seatings</option>
                            <option value="capacity">Capacity Limit</option>
                          </select>
                        </div>
                        {regType === "capacity" && (
                          <div className="space-y-1">
                            <Label htmlFor="wiz-cap">Capacity Limit</Label>
                            <Input id="wiz-cap" type="number" value={capLimit} onChange={e => setCapLimit(Number(e.target.value))} />
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="wiz-approve">Approval mode</Label>
                          <select id="wiz-approve" value={approvalMode} onChange={e => setApprovalMode(e.target.value as any)} className="w-full bg-secondary border border-border h-9 rounded px-2 text-sm text-foreground">
                            <option value="auto">Auto Approval</option>
                            <option value="manual">Manual Approval</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="wiz-theme">Design Theme</Label>
                          <select id="wiz-theme" value={eventTheme} onChange={e => setEventTheme(e.target.value)} className="w-full bg-secondary border border-border h-9 rounded px-2 text-sm text-foreground">
                            {["Professional", "Corporate", "Wedding", "Festival", "Dark", "Minimal"].map(t => (
                              <option key={t} value={t}>{t} Theme</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    <DialogFooter className="pt-2 flex gap-2 sm:justify-end">
                      <Button 
                        variant="outline"
                        onClick={() => handleWizardSubmit("draft")} 
                        disabled={!workspaceId}
                        className="flex-1 sm:flex-none border-border/80 hover:bg-secondary/80 text-foreground"
                      >
                        Save Draft
                      </Button>
                      <Button 
                        onClick={() => handleWizardSubmit("published")} 
                        disabled={!workspaceId}
                        className="flex-1 sm:flex-none bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-none shadow-md hover:from-emerald-600 hover:to-teal-700"
                      >
                        Publish Event
                      </Button>
                    </DialogFooter>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Dynamic Statistics cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total events", value: String(totalEvents), icon: CalendarPlus, hint: "active" },
          { label: "Registrations", value: String(totalRegistrations), hint: "all time", icon: Users2 },
          { label: "Check-in rate", value: "85%", icon: CheckCircle2, hint: "average attendance" },
          { label: "Traffic conversion", value: "32%", icon: Star, hint: "visitor conversion" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-4 mt-6">
        
        {/* Left Sidebar: Events lists */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 px-1">Your Events</h3>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map(i => <div key={i} className="h-16 animate-pulse bg-secondary/60 rounded-xl" />)}
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground panel text-xs">
              No events found. Click Create Event above.
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((e) => (
                <div
                  key={e.id}
                  onClick={() => setActiveEvent(e)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border text-left cursor-pointer transition-all ${
                    activeEvent?.id === e.id
                      ? "border-primary/50 bg-primary/5 shadow-sm"
                      : "border-border/60 hover:bg-secondary/40"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <h4 className="font-semibold text-sm truncate">{e.name}</h4>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">Category: {e.subcategory || "Other"}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Badge variant="outline" className={`capitalize text-[9px] px-1.5 py-0 ${
                        e.status === "published" 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : e.status === "archived" 
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                            : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                      }`}>
                        {e.status}
                      </Badge>
                    </div>
                  </div>
                  <div onClick={(ev) => ev.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7 rounded-lg hover:bg-secondary">
                          <MoreVertical className="size-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 bg-popover border border-border p-1 rounded-md shadow-md">
                        <DropdownMenuItem onClick={() => {
                          setEditEventData(e);
                          setEditName(e.name);
                          setEditVenue(e.venue || "");
                          setEditDate(e.date ? e.date.slice(0, 16) : "");
                          setEditRegType(e.registration_type || "unlimited");
                          setEditCapLimit(e.capacity_limit || 100);
                          setEditApprovalMode(e.approval_mode || "auto");
                          setEditTheme(e.theme || "Professional");
                          setEditOpen(true);
                        }} className="flex items-center text-xs px-2 py-1.5 rounded hover:bg-secondary cursor-pointer">
                          <Edit className="size-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        {e.status !== "published" ? (
                          <DropdownMenuItem onClick={() => handleQuickPublish(e)} className="flex items-center text-xs px-2 py-1.5 rounded hover:bg-secondary cursor-pointer">
                            <Globe className="size-3.5 mr-2" /> Publish
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleQuickUnpublish(e)} className="flex items-center text-xs px-2 py-1.5 rounded hover:bg-secondary cursor-pointer">
                            <Globe className="size-3.5 mr-2" /> Unpublish
                          </DropdownMenuItem>
                        )}
                        {e.status !== "archived" && (
                          <DropdownMenuItem onClick={() => handleQuickArchive(e)} className="flex items-center text-xs px-2 py-1.5 rounded hover:bg-secondary cursor-pointer">
                            <Archive className="size-3.5 mr-2" /> Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDuplicate(e)} className="flex items-center text-xs px-2 py-1.5 rounded hover:bg-secondary cursor-pointer">
                          <Copy className="size-3.5 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setEventToDelete(e);
                          setDeleteConfirmOpen(true);
                        }} className="flex items-center text-xs px-2 py-1.5 rounded text-destructive hover:bg-destructive/10 cursor-pointer">
                          <Trash2 className="size-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                        <div className="h-px bg-border my-1" />
                        <DropdownMenuItem onClick={() => copyEventLink(e)} className="flex items-center text-xs px-2 py-1.5 rounded hover:bg-secondary cursor-pointer">
                          <Link2 className="size-3.5 mr-2" /> Copy Link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setQrEvent(e);
                          setQrOpen(true);
                        }} className="flex items-center text-xs px-2 py-1.5 rounded hover:bg-secondary cursor-pointer">
                          <QrCode className="size-3.5 mr-2" /> View QR
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Content: Organizer Panel Tabbed View */}
        <div className="lg:col-span-3 space-y-4">
          {activeEvent ? (
            <ChartCard
              title={activeEvent?.name || ""}
              subtitle={`${activeEvent?.venue || ""} · ${activeEvent?.status || ""}`}
              actions={
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={copyLandingLink} className="gap-1">
                    <Copy className="size-3.5" /> Public URL
                  </Button>
                  <Dialog open={regOpen} onOpenChange={setRegOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Plus className="size-3.5" /> Register Attendee
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Register Attendee</DialogTitle>
                        <DialogDescription>Quick manual checkout registration.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="space-y-1">
                          <Label htmlFor="reg-name">Full Name</Label>
                          <Input id="reg-name" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Jane Doe" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="reg-email">Email Address</Label>
                          <Input id="reg-email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="jane@company.com" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="reg-phone">WhatsApp Mobile</Label>
                          <Input id="reg-phone" value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="+91XXXXXXXXXX" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={async () => {
                          if(!regName.trim()) return;
                          if (!activeEvent || !activeEvent.workspace_id) {
                            toast.error("Event workspace ID is not available.");
                            return;
                          }
                          try {
                            await registerAttendee({
                              data: {
                                eventId: activeEvent.id,
                                workspaceId: activeEvent.workspace_id,
                                name: regName.trim(),
                                email: regEmail || null,
                                phone: regPhone || null
                              }
                            });
                            toast.success("Attendee registered successfully!");
                            setRegOpen(false);
                            fetchActiveEventDetails();
                          } catch (err: any) {
                            toast.error(err.message || "Registration failed");
                          }
                        }} className="w-full">Register</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              }
            >
              <Tabs defaultValue="overview">
                <TabsList className="w-full flex justify-start overflow-x-auto h-auto p-1 bg-secondary/40 border rounded-lg gap-1">
                  {["Overview", "Attendees", "Registrations", "Landing Page", "Automation", "Messages", "Settings", "Analytics"].map(tab => (
                    <TabsTrigger key={tab} value={tab.toLowerCase().replace(" ", "-")} className="text-xs py-1.5 px-3">
                      {tab}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* TAB: Overview */}
                <TabsContent value="overview" className="mt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="panel p-4 bg-secondary/20 rounded-xl text-center">
                      <span className="block text-2xl font-bold text-primary">{analytics.views}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total Views</span>
                    </div>
                    <div className="panel p-4 bg-secondary/20 rounded-xl text-center">
                      <span className="block text-2xl font-bold text-primary">{attendees.length}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Registrations</span>
                    </div>
                    <div className="panel p-4 bg-secondary/20 rounded-xl text-center">
                      <span className="block text-2xl font-bold text-primary">
                        {attendees.filter(a => a.checked_in).length}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Checked-In</span>
                    </div>
                  </div>

                  <div className="panel p-5 bg-secondary/10 rounded-xl space-y-3">
                    <h4 className="font-semibold text-sm">Event Checklist</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-500" />
                        <span>Categories & industry templates preloaded.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-500" />
                        <span>Form fields initialized ({formFields.length} fields).</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={activeEvent?.status !== "draft" ? "size-4 text-emerald-500" : "size-4 text-muted-foreground"} />
                        <span>Publish status: <strong className="uppercase">{activeEvent?.status || "DRAFT"}</strong></span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB: Registrations */}
                <TabsContent value="registrations" className="mt-4 space-y-4">
                  {attendees.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                      No registrants yet. Share the public landing link to acquire tickets.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Attendee</TableHead>
                          <TableHead>Phone / Email</TableHead>
                          <TableHead>Check-in Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendees.map((at) => (
                          <TableRow key={at.id}>
                            <TableCell className="font-semibold text-sm">{at.name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {at.phone || at.email || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={at.checked_in ? "default" : "secondary"}>
                                {at.checked_in ? "Checked in" : "Pending"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {!at.checked_in && (
                                <Button size="sm" variant="ghost" onClick={() => handleOperatorCheckIn(at.id, at.name)}>
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

                {/* TAB: Attendees (Full Approval & Management) */}
                <TabsContent value="attendees" className="mt-4">
                  <EventAttendeesTab
                    activeEvent={activeEvent}
                    attendees={attendees}
                    ticketTiers={ticketTiers}
                    onRefresh={fetchActiveEventDetails}
                  />
                </TabsContent>

                {/* TAB: Landing Page builder */}
                <TabsContent value="landing-page" className="mt-4 space-y-4">
                  <div className="panel p-5 bg-secondary/20 rounded-xl space-y-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Pre-defined Landing Sections</Label>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {["Banner", "Countdown", "About", "Agenda", "Speakers", "FAQ", "Registration", "Footer"].map(sec => {
                          const isEnabled = (activeEvent?.landing_page_sections || []).includes(sec);
                          return (
                            <button
                              key={sec}
                              onClick={async () => {
                                if (!activeEvent?.id) return;
                                const list = activeEvent.landing_page_sections || [];
                                const nextList = isEnabled ? list.filter((l: string) => l !== sec) : [...list, sec];
                                await (supabase as any).from("events").update({ landing_page_sections: nextList }).eq("id", activeEvent.id);
                                toast.success(`Section ${sec} updated!`);
                                fetchEvents();
                              }}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                                isEnabled 
                                  ? "bg-primary text-white border-primary" 
                                  : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
                              }`}
                            >
                              {sec}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Change Theme</Label>
                        <select 
                          value={activeEvent?.theme || "Professional"} 
                          onChange={async (e) => {
                            if (!activeEvent?.id) return;
                            await (supabase as any).from("events").update({ theme: e.target.value }).eq("id", activeEvent.id);
                            toast.success("Theme changed!");
                            fetchEvents();
                          }}
                          className="w-full bg-secondary border border-border h-10 px-2 rounded-lg text-xs text-foreground"
                        >
                          {["Professional", "Corporate", "Wedding", "Festival", "Dark", "Minimal"].map(t => (
                            <option key={t} value={t}>{t} Theme</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB: Automation Linkage */}
                <TabsContent value="automation" className="mt-4 space-y-4">
                  <div className="panel p-5 bg-secondary/20 rounded-xl space-y-3">
                    <h4 className="font-semibold text-sm">Linked Automations</h4>
                    <p className="text-xs text-muted-foreground">
                      Linked events will execute reminder templates automatically.
                    </p>
                    <div className="border border-dashed rounded-lg p-6 text-center text-xs text-muted-foreground">
                      Events link automatically to WhatsApp and Certificate workflows. Use the main Automations tab to define rules.
                    </div>
                  </div>
                </TabsContent>

                {/* TAB: Message history */}
                <TabsContent value="messages" className="mt-4 space-y-4">
                  {outboxMessages.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                      No messages sent for this event.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Recipient</TableHead>
                          <TableHead>Template</TableHead>
                          <TableHead>Outcome</TableHead>
                          <TableHead className="text-right">Sent At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {outboxMessages.map((msg) => (
                          <TableRow key={msg.id}>
                            <TableCell className="font-semibold text-xs">{msg.recipient_name}</TableCell>
                            <TableCell className="text-xs font-mono">{msg.template_id}</TableCell>
                            <TableCell>
                              <Badge variant={msg.status === "sent" ? "default" : "secondary"}>
                                {msg.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {new Date(msg.sent_at).toLocaleTimeString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                {/* TAB: Settings */}
                <TabsContent value="settings" className="mt-4 space-y-4">
                  <div className="panel p-5 bg-secondary/20 rounded-xl space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Change Event Status</Label>
                      <select 
                        value={activeEvent?.status || "draft"} 
                        onChange={(e) => handleStatusChange(e.target.value)}
                        className="w-full bg-secondary border border-border h-10 px-2 rounded-lg text-xs text-foreground"
                      >
                        {["draft", "published", "archived"].map(st => (
                          <option key={st} value={st}>{st.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Registration Limits</Label>
                        <div className="text-xs text-muted-foreground mt-1">
                          Limit mode: <strong>{activeEvent?.registration_type || "unlimited"}</strong> <br />
                          Seat limit: <strong>{activeEvent?.capacity_limit || "unlimited"}</strong>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Payment Settings</Label>
                        <div className="text-xs text-muted-foreground mt-1">
                          Paid events preparation: <strong>Free (Stripe/Razorpay offline)</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB: Analytics Charting */}
                <TabsContent value="analytics" className="mt-4 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Traffic sources chart */}
                    <ChartCard title="Traffic Sources" subtitle="Page views split by referrer channels">
                      {analytics.sources.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">No traffic logs found yet.</div>
                      ) : (
                        <div className="h-60 w-full pt-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={analytics.sources}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {analytics.sources.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </ChartCard>

                    {/* Device breakdown chart */}
                    <ChartCard title="Device Breakdown" subtitle="Page views split by device types">
                      {analytics.devices.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">No device logs found yet.</div>
                      ) : (
                        <div className="h-60 w-full pt-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.devices}>
                              <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                              <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                              <Tooltip cursor={{ fill: "transparent" }} />
                              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </ChartCard>
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

      {/* Edit Event Details Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md bg-background border border-border">
          <DialogHeader>
            <DialogTitle>Edit Event Details</DialogTitle>
            <DialogDescription>Modify fields and save updates to your event.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <Label htmlFor="edit-name">Event Name</Label>
              <Input id="edit-name" value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-venue">Venue Address</Label>
              <Input id="edit-venue" value={editVenue} onChange={e => setEditVenue(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-date">Date & Time</Label>
              <Input id="edit-date" type="datetime-local" value={editDate} onChange={e => setEditDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="edit-reg">Registration Type</Label>
                <select id="edit-reg" value={editRegType} onChange={e => setEditRegType(e.target.value as any)} className="w-full bg-secondary border border-border h-9 rounded px-2 text-sm text-foreground">
                  <option value="unlimited">Unlimited Seatings</option>
                  <option value="capacity">Capacity Limit</option>
                </select>
              </div>
              {editRegType === "capacity" && (
                <div className="space-y-1">
                  <Label htmlFor="edit-cap">Capacity Limit</Label>
                  <Input id="edit-cap" type="number" value={editCapLimit} onChange={e => setEditCapLimit(Number(e.target.value))} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="edit-approve">Approval Mode</Label>
                <select id="edit-approve" value={editApprovalMode} onChange={e => setEditApprovalMode(e.target.value as any)} className="w-full bg-secondary border border-border h-9 rounded px-2 text-sm text-foreground">
                  <option value="auto">Auto Approval</option>
                  <option value="manual">Manual Approval</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-theme">Design Theme</Label>
                <select id="edit-theme" value={editTheme} onChange={e => setEditTheme(e.target.value)} className="w-full bg-secondary border border-border h-9 rounded px-2 text-sm text-foreground">
                  {["Professional", "Corporate", "Wedding", "Festival", "Dark", "Minimal"].map(t => (
                    <option key={t} value={t}>{t} Theme</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSubmit} className="bg-primary text-primary-foreground">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Event Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-background border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the event "{eventToDelete?.name}" and all of its registrants, tickets, and analytics.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground hover:bg-secondary">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* QR Code Viewer Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm text-center bg-background border border-border">
          <DialogHeader>
            <DialogTitle>Event Registration QR Code</DialogTitle>
            <DialogDescription>Scan this QR code to visit the public registration page.</DialogDescription>
          </DialogHeader>
          {qrEvent && (
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <div className="p-4 bg-white rounded-2xl shadow-sm border">
                <QRCodeSVG
                  value={typeof window !== "undefined" ? `${window.location.origin}/e/${qrEvent.slug}` : `https://engageai-gold.vercel.app/e/${qrEvent.slug}`}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-xs text-muted-foreground break-all max-w-[280px]">
                {typeof window !== "undefined" ? `${window.location.origin}/e/${qrEvent.slug}` : `https://engageai-gold.vercel.app/e/${qrEvent.slug}`}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrOpen(false)} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
