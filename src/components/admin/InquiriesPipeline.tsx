import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, RefreshCw, ChevronLeft, ChevronRight, Eye, CheckCircle, XCircle, Clock, Trash2, Send, MessageSquare, CalendarCheck, Loader2, Home, DollarSign, Sparkles, RotateCcw, Heart, FileText, Languages, CreditCard } from "lucide-react";
import ThreadedChat from "@/components/admin/ThreadedChat";
import { formatTime12, toDateInputValue, toTimeInputValue, formatLabel, STATUS_COLORS } from "./shared/utils";
import { getEmailTemplates } from "./shared/emailTemplates";
import type { Booking } from "./shared/types";
import type { EmailTemplate } from "./shared/emailTemplates";

const INQUIRY_STATUSES = ["pending", "contacted", "estimate-scheduled", "quoted", "declined"];

const PAGE_SIZE = 15;

const InquiriesPipeline = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);

  // Estimate scheduling
  const [estimateDate, setEstimateDate] = useState("");
  const [estimateTime, setEstimateTime] = useState("");
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [showInviteApproval, setShowInviteApproval] = useState(false);
  const [pendingEstimateBookingId, setPendingEstimateBookingId] = useState<string | null>(null);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [pendingCalendarSync, setPendingCalendarSync] = useState(false);

  // Communications
  const [pendingTemplateSubject, setPendingTemplateSubject] = useState("");
  const [pendingTemplateBody, setPendingTemplateBody] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [detailTab, setDetailTab] = useState("details");

  // Deposit collection
  const [depositOverride, setDepositOverride] = useState<string>("");
  const [sendingDepositLink, setSendingDepositLink] = useState(false);
  const [showDepositConfirm, setShowDepositConfirm] = useState(false);

  // Translation state
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<Record<string, boolean>>({});

  const translateText = async (key: string, text: string, targetLang = "es") => {
    if (translations[key]) {
      // Toggle off
      setTranslations((prev) => { const n = { ...prev }; delete n[key]; return n; });
      return;
    }
    setTranslating((prev) => ({ ...prev, [key]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("translate-text", {
        body: { text, targetLang },
      });
      if (error) throw error;
      setTranslations((prev) => ({ ...prev, [key]: data.translated }));
    } catch (err) {
      console.error("Translation error:", err);
      toast({ title: t("admin.error"), description: "Translation failed", variant: "destructive" });
    }
    setTranslating((prev) => ({ ...prev, [key]: false }));
  };

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bulkActioning, setBulkActioning] = useState(false);

  const { toast } = useToast();
  const { t } = useLanguage();

  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .in("status", INQUIRY_STATUSES)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: t("admin.error"), description: t("admin.bookings.error"), variant: "destructive" });
    } else {
      setBookings((data as Booking[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, []);




  const filtered = bookings.filter((b) => {
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    const matchesSearch = !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.email.toLowerCase().includes(search.toLowerCase()) ||
      b.phone.includes(search);
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const openDetail = (booking: Booking) => {
    console.log("[InquiriesPipeline] openDetail called", { id: booking.id, name: booking.name, service_type: booking.service_type, frequency: booking.frequency });
    try {
      setSelected(booking);
      setAdminNotes(booking.admin_notes || "");
      setEstimateDate(toDateInputValue(booking.estimate_date));
      setEstimateTime(toTimeInputValue(booking.estimate_time));
      setPendingTemplateSubject("");
      setPendingTemplateBody("");
      setDetailTab("details");
      setDepositOverride(booking.deposit_override != null ? String(booking.deposit_override) : "");
      console.log("[InquiriesPipeline] openDetail completed successfully");
    } catch (err) {
      console.error("[InquiriesPipeline] openDetail error:", err);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!selected) return;
    setSaving(true);
    const updateData: Record<string, unknown> = { status: newStatus, admin_notes: adminNotes };
    
    if (newStatus === "estimate-scheduled" && estimateDate) {
      updateData.estimate_date = estimateDate;
      updateData.estimate_time = estimateTime || null;
    }

    const { error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", selected.id);

    if (error) {
      toast({ title: t("admin.error"), description: t("admin.bookings.error.update"), variant: "destructive" });
    } else {
      toast({ title: t("admin.bookings.updated"), description: t("admin.bookings.updated.msg") });
      if (newStatus === "approved") {
        setBookings((prev) => prev.filter((b) => b.id !== selected.id));
      } else {
        setBookings((prev) =>
          prev.map((b) => b.id === selected.id ? { ...b, status: newStatus, admin_notes: adminNotes, estimate_date: estimateDate || null, estimate_time: estimateTime || null } : b)
        );
      }
      setSelected(null);
    }
    setSaving(false);
  };

  const saveEstimate = async () => {
    if (!selected || !estimateDate) return;
    setSaving(true);
    const { error } = await supabase
      .from("bookings")
      .update({
        estimate_date: estimateDate,
        estimate_time: estimateTime || null,
        status: "estimate-scheduled",
        admin_notes: adminNotes,
      })
      .eq("id", selected.id);

    if (error) {
      toast({ title: t("admin.error"), description: t("admin.bookings.error.update"), variant: "destructive" });
      setSaving(false);
      return;
    }

    // Auto-sync to Google Calendar
    setSyncingCalendar(true);
    try {
      const { error: calError } = await supabase.functions.invoke("sync-google-calendar", {
        body: { bookingId: selected.id, action: selected.google_calendar_event_id ? "update" : "create" },
      });
      if (calError) throw calError;
      toast({ title: t("admin.cal.synced"), description: t("admin.cal.synced.desc") });
    } catch (err) {
      console.error("Calendar sync error:", err);
      toast({ title: t("admin.cal.syncfail"), description: t("admin.cal.syncfail.desc"), variant: "destructive" });
    }
    setSyncingCalendar(false);

    // Update local state
    setBookings((prev) =>
      prev.map((b) => b.id === selected.id ? { ...b, status: "estimate-scheduled", estimate_date: estimateDate, estimate_time: estimateTime || null, admin_notes: adminNotes } : b)
    );

    // Prompt admin to approve sending invite to customer
    setPendingEstimateBookingId(selected.id);
    setShowInviteApproval(true);
    setSaving(false);
  };

  const sendEstimateInvite = async () => {
    if (!selected) return;
    setSendingInvite(true);
    try {
      const visitDate = estimateDate;
      const visitTime = formatTime12(estimateTime);
      const titleName = selected.name.replace(/\b\w/g, (c: string) => c.toUpperCase());
      const { error } = await supabase.functions.invoke("send-customer-email", {
        body: {
          customerEmail: selected.email,
          customerName: titleName,
          subject: `Your In-Home Estimate Visit — ${visitDate}`,
          body: `We've scheduled a free in-home estimate visit at your home.\n\n📅 Date: ${visitDate}\n🕐 Time: ${visitTime}\n📍 Address: ${selected.street}, ${selected.city}, CA ${selected.zip}\n\nOur team will visit to assess your home and provide you with a personalized quote. This is NOT a cleaning appointment — it's a quick visit so we can give you an accurate price.\n\nIf you need to reschedule, please reply to this email or call us.\n\nThank you!\nMaid for Chico`,
        },
      });
      if (error) throw error;

      // Log the communication
      await supabase.from("customer_communications").insert({
        booking_id: selected.id,
        customer_id: selected.customer_id || null,
        type: "email",
        subject: `Estimate Visit Scheduled — ${visitDate}`,
        body: `Estimate visit invite sent for ${visitDate} at ${visitTime}`,
      });

      toast({ title: t("admin.invite.sent"), description: `${t("admin.invite.sent.desc")} ${selected.email}` });
    } catch (err) {
      console.error("Send invite error:", err);
      toast({ title: t("admin.error"), description: t("admin.invite.fail"), variant: "destructive" });
    }
    setSendingInvite(false);
    setShowInviteApproval(false);
    setPendingEstimateBookingId(null);
    setSelected(null);
  };


  const applyTemplate = (template: EmailTemplate) => {
    if (!selected) return;
    setPendingTemplateSubject(template.subject(selected));
    setPendingTemplateBody(template.body(selected));
  };

  // Bulk actions
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paged.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paged.map((b) => b.id)));
    }
  };

  const handleBulkDelete = async () => {
    setBulkActioning(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("bookings").update({ deleted_at: new Date().toISOString() } as any).in("id", ids);
    if (error) {
      toast({ title: t("admin.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("admin.bulk.delete"), description: `${ids.length} ${t("admin.inquiries.deleted.desc")}` });
      setBookings((prev) => prev.filter((b) => !selectedIds.has(b.id)));
      setSelectedIds(new Set());
    }
    setBulkActioning(false);
    setShowDeleteConfirm(false);
  };

  const statusKeys = ["all", ...INQUIRY_STATUSES] as const;
  const counts: Record<string, number> = {
    all: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    contacted: bookings.filter((b) => b.status === "contacted").length,
    "estimate-scheduled": bookings.filter((b) => b.status === "estimate-scheduled").length,
    quoted: bookings.filter((b) => b.status === "quoted").length,
    declined: bookings.filter((b) => b.status === "declined").length,
  };

  const statusLabel = (s: string) => {
    const labels: Record<string, string> = {
      all: t("admin.inquiry.all"),
      pending: t("admin.inquiry.pending"),
      contacted: t("admin.inquiry.contacted"),
      "estimate-scheduled": t("admin.inquiry.estimate-scheduled"),
      quoted: t("admin.inquiry.quoted.btn"),
      declined: t("admin.inquiry.declined"),
    };
    return labels[s] || s;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {statusKeys.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(0); }}
            className={`p-4 rounded-lg border text-left transition-colors ${
              statusFilter === s ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-secondary"
            }`}
          >
            <p className="text-2xl font-semibold">{counts[s]}</p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{statusLabel(s)}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("admin.bookings.search")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={fetchBookings} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> {t("admin.bookings.refresh")}
        </Button>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-accent/30 bg-accent/5">
          <span className="text-sm font-medium">{selectedIds.size} {t("admin.bulk.selected")}</span>
          <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(true)} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
            <Trash2 className="w-3.5 h-3.5" /> {t("admin.bulk.delete")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs">
            {t("admin.bulk.clear")}
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead className="w-10">
                <Checkbox
                  checked={paged.length > 0 && selectedIds.size === paged.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>{t("admin.bookings.date")}</TableHead>
              <TableHead>{t("admin.bookings.name")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("admin.bookings.service")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("admin.inquiry.estimatevisit")}</TableHead>
              <TableHead>{t("admin.bookings.status")}</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  {loading ? t("admin.bookings.loading") : t("admin.inquiry.none")}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((b) => (
                <TableRow key={b.id} className="cursor-pointer hover:bg-secondary/30">
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(b.id)}
                      onCheckedChange={() => toggleSelect(b.id)}
                    />
                  </TableCell>
                  <TableCell className="text-sm" onClick={() => openDetail(b)}>{new Date(b.created_at).toLocaleDateString()}</TableCell>
                  <TableCell onClick={() => openDetail(b)}>
                    <div className="font-medium text-sm">{b.name}</div>
                    <div className="text-xs text-muted-foreground">{b.email}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm capitalize" onClick={() => openDetail(b)}>{formatLabel(b.service_type)}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm" onClick={() => openDetail(b)}>
                    {b.estimate_date ? (
                      <span className="text-xs">{b.estimate_date}{b.estimate_time ? ` @ ${formatTime12(b.estimate_time)}` : ""}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell onClick={() => openDetail(b)}>
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[b.status] || ""}`}>
                      {statusLabel(b.status)}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={() => openDetail(b)}>
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t("admin.bookings.page")} {page + 1} {t("admin.bookings.of")} {totalPages} ({filtered.length} {t("admin.bookings.results")})</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.inquiry.details")}</DialogTitle>
            <DialogDescription>{t("admin.inquiry.details.desc")}</DialogDescription>
          </DialogHeader>
          {selected && (
            <Tabs value={detailTab} onValueChange={setDetailTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details" className="gap-1.5 text-xs">
                  <Eye className="w-3.5 h-3.5" /> {t("admin.inquiry.details.tab")}
                </TabsTrigger>
                <TabsTrigger value="estimate" className="gap-1.5 text-xs">
                  <CalendarCheck className="w-3.5 h-3.5" /> {t("admin.inquiry.estimatevisit")}
                </TabsTrigger>
                <TabsTrigger value="deposit" className="gap-1.5 text-xs">
                  <DollarSign className="w-3.5 h-3.5" /> {t("admin.deposit.tab")}
                </TabsTrigger>
                <TabsTrigger value="messages" className="gap-1.5 text-xs">
                  <MessageSquare className="w-3.5 h-3.5" /> {t("admin.inquiry.messages")}
                </TabsTrigger>
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-5 mt-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.name")}</p>
                    <p className="font-medium">{selected.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.phone")}</p>
                    <p>{selected.phone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.email")}</p>
                    <p>{selected.email}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.address")}</p>
                    <p>{selected.street}, {selected.city}, CA {selected.zip}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.service")}</p>
                    <p className="capitalize">{formatLabel(selected.service_type)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.frequency")}</p>
                    <p className="capitalize">{formatLabel(selected.frequency)}</p>
                  </div>
                  {selected.sqft && (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.sqft")}</p>
                      <p>{selected.sqft}</p>
                    </div>
                  )}
                  {selected.bedrooms && (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.bedrooms")}</p>
                      <p>{selected.bedrooms}</p>
                    </div>
                  )}
                  {selected.bathrooms && (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.bathrooms")}</p>
                      <p>{selected.bathrooms}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.inquiry.desiredcleaning")}</p>
                    <p>{selected.preferred_date}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.preftime")}</p>
                    <p className="capitalize">{selected.preferred_time || t("admin.bookings.nopref")}</p>
                  </div>
                </div>

                {selected.notes && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-muted-foreground text-xs uppercase tracking-wider">{t("admin.bookings.custnotes")}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => translateText(`notes-${selected.id}`, selected.notes!, "en")}
                        disabled={translating[`notes-${selected.id}`]}
                      >
                        {translating[`notes-${selected.id}`] ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Languages className="w-3 h-3" />
                        )}
                        {translations[`notes-${selected.id}`] ? t("admin.translate.original") : t("admin.translate.btn")}
                      </Button>
                    </div>
                    <p className="text-sm bg-secondary/50 rounded p-3">
                      {translations[`notes-${selected.id}`] || selected.notes}
                    </p>
                    {translations[`notes-${selected.id}`] && (
                      <p className="text-[10px] text-muted-foreground mt-1 italic">{t("admin.translate.auto")}</p>
                    )}
                  </div>
                )}

                <div className="border-t border-border pt-4 space-y-4">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">{t("admin.bookings.adminnotes")}</label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder={t("admin.bookings.adminnotes.placeholder")}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Button
                      onClick={() => updateStatus("contacted")}
                      disabled={saving || selected.status === "contacted"}
                      variant="outline"
                      className="gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs"
                    >
                      <Clock className="w-3.5 h-3.5" /> {t("admin.inquiry.contacted")}
                    </Button>
                    <Button
                      onClick={() => updateStatus("quoted")}
                      disabled={saving || selected.status === "quoted"}
                      variant="outline"
                      className="gap-1.5 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 text-xs"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> {t("admin.inquiry.quoted.btn")}
                    </Button>
                    <Button
                      onClick={() => updateStatus("approved")}
                      disabled={saving}
                      className="gap-1.5 bg-green-600 text-white hover:bg-green-700 text-xs"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> {t("admin.inquiry.approve")}
                    </Button>
                    <Button
                      onClick={() => updateStatus("declined")}
                      disabled={saving || selected.status === "declined"}
                      variant="outline"
                      className="gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs"
                    >
                      <XCircle className="w-3.5 h-3.5" /> {t("admin.inquiry.decline")}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Estimate Visit Tab */}
              <TabsContent value="estimate" className="space-y-5 mt-4">
                <div className="p-4 rounded-lg border border-border bg-secondary/30">
                  <h4 className="text-sm font-medium mb-1">{t("admin.inquiry.schedule.title")}</h4>
                  <p className="text-xs text-muted-foreground mb-4">
                    {t("admin.inquiry.schedule.desc")}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">{t("admin.inquiry.visitdate")}</label>
                      <Input
                        type="date"
                        value={estimateDate}
                        onChange={(e) => setEstimateDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">{t("admin.inquiry.visittime")}</label>
                      <Input
                        type="time"
                        value={estimateTime}
                        onChange={(e) => setEstimateTime(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Customer's requested estimate date if available */}
                {selected.estimate_date && !estimateDate && (
                  <div className="p-4 rounded-lg border border-blue-500/30 bg-blue-500/5">
                    <h4 className="text-sm font-medium text-blue-400 mb-1">{t("admin.inquiry.customerrequest")}</h4>
                    <p className="text-sm mb-3">{selected.estimate_date}{selected.estimate_time ? ` ${t("admin.inquiry.at")} ${formatTime12(selected.estimate_time)}` : ""}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                      onClick={() => {
                        setEstimateDate(toDateInputValue(selected.estimate_date));
                        setEstimateTime(toTimeInputValue(selected.estimate_time));
                      }}
                    >
                      <CalendarCheck className="w-3.5 h-3.5" /> {t("admin.inquiry.usethisdate")}
                    </Button>
                  </div>
                )}

                {selected.estimate_date && estimateDate && (
                  <div className="p-4 rounded-lg border border-purple-500/30 bg-purple-500/5">
                    <h4 className="text-sm font-medium text-purple-400 mb-1">{t("admin.inquiry.currentestimate")}</h4>
                    <p className="text-sm">{selected.estimate_date}{selected.estimate_time ? ` ${t("admin.inquiry.at")} ${formatTime12(selected.estimate_time)}` : ""}</p>
                  </div>
                )}

                <div className="p-4 rounded-lg border border-border bg-secondary/30">
                  <h4 className="text-sm font-medium mb-1">{t("admin.inquiry.desiredcleaning")}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{t("admin.inquiry.fromrequest")}</p>
                  <p className="text-sm font-medium">{selected.preferred_date} {selected.preferred_time ? `(${formatTime12(selected.preferred_time)})` : ""}</p>
                </div>

                <Button
                  onClick={saveEstimate}
                  disabled={saving || !estimateDate}
                  className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                >
                    {saving || syncingCalendar ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CalendarCheck className="w-4 h-4" />
                    )}
                    {syncingCalendar ? t("admin.inquiry.syncing") : saving ? t("admin.inquiry.saving") : t("admin.inquiry.schedulebtn")}
                </Button>

                {/* Quick Email Actions */}
                <div className="border-t border-border pt-4 space-y-3">
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" /> {t("admin.inquiry.quickemail")}
                  </h4>

                  {/* Quote Amount Input */}
                  <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                      <Input
                        type="number"
                        placeholder={selected.total_price ? `${t("admin.inquiry.quote.saved")}: $${selected.total_price}` : t("admin.inquiry.quote.enter")}
                        value={quoteAmount}
                        onChange={(e) => setQuoteAmount(e.target.value)}
                        className="h-8 text-sm bg-background/50 border-emerald-500/20 focus:border-emerald-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">{t("admin.inquiry.quote.pervisit")}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 shrink-0 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        disabled={!quoteAmount || parseFloat(quoteAmount) === selected.total_price}
                        onClick={async () => {
                          const { error } = await supabase
                            .from("bookings")
                            .update({ total_price: parseFloat(quoteAmount) })
                            .eq("id", selected.id);
                          if (error) {
                            toast({ title: t("admin.error"), description: t("admin.inquiry.quote.savefail"), variant: "destructive" });
                          } else {
                            toast({ title: t("admin.inquiry.quote.saved"), description: `${t("admin.inquiry.quote.updated")} $${quoteAmount}` });
                            setSelected({ ...selected, total_price: parseFloat(quoteAmount) });
                            setBookings(prev => prev.map(b => b.id === selected.id ? { ...b, total_price: parseFloat(quoteAmount) } : b));
                          }
                        }}
                      >
                        {t("admin.save")}
                      </Button>
                    </div>
                    {quoteAmount && parseFloat(quoteAmount) !== selected.total_price && (
                      <p className="text-xs text-amber-400/80 pl-6">⚠️ {t("admin.inquiry.quote.unsaved")}</p>
                    )}
                    {selected.total_price && !quoteAmount && (
                      <p className="text-xs text-emerald-400/70 pl-6">
                        {t("admin.inquiry.quote.usingsaved")} <strong>${selected.total_price}</strong>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {getEmailTemplates(
                      quoteAmount ? { ...selected, _quoteAmount: quoteAmount } as any : selected,
                      t
                    ).filter(t => ["estimate-request", "estimate-confirm", "estimate-reschedule", "send-quote"].includes(t.id)).map((tmpl) => (
                      <Button
                        key={tmpl.id}
                        variant="outline"
                        size="sm"
                        className={`gap-1.5 text-xs justify-start ${tmpl.color}`}
                        onClick={async () => {
                          if (tmpl.id === "estimate-confirm" && selected.estimate_date) {
                            // Save estimate date + status first, then go to Messages tab
                            const confirmDate = toDateInputValue(selected.estimate_date);
                            const confirmTime = toTimeInputValue(selected.estimate_time);
                            setEstimateDate(confirmDate);
                            setEstimateTime(confirmTime);
                            setSaving(true);
                            const { error } = await supabase
                              .from("bookings")
                              .update({
                                estimate_date: confirmDate,
                                estimate_time: confirmTime || null,
                                status: "estimate-scheduled",
                                admin_notes: adminNotes,
                              })
                              .eq("id", selected.id);
                            if (error) {
                              toast({ title: t("admin.error"), description: t("admin.bookings.error.update"), variant: "destructive" });
                              setSaving(false);
                              return;
                            }
                            // Update local state
                            setBookings((prev) =>
                              prev.map((b) => b.id === selected.id ? { ...b, status: "estimate-scheduled", estimate_date: confirmDate, estimate_time: confirmTime || null, admin_notes: adminNotes } : b)
                            );
                            setSelected({ ...selected, status: "estimate-scheduled", estimate_date: confirmDate, estimate_time: confirmTime || null });
                            setSaving(false);
                            // Flag calendar sync for when email is sent
                            setPendingCalendarSync(true);
                            // Pre-fill template and switch to messages tab
                            applyTemplate(tmpl);
                            setDetailTab("messages");
                          } else {
                            applyTemplate(tmpl);
                            setDetailTab("messages");
                          }
                        }}
                      >
                        {tmpl.icon} {tmpl.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Collect Deposit Tab */}
              <TabsContent value="deposit" className="space-y-5 mt-4">
                {(() => {
                  const quoteTotal = selected.total_price || (quoteAmount ? parseFloat(quoteAmount) : 0);
                  const defaultDep = quoteTotal > 0 ? quoteTotal * 0.25 : 0;
                  const customDep = depositOverride !== "" ? parseFloat(depositOverride) : null;
                  const effectiveDeposit = customDep !== null && !isNaN(customDep) ? customDep : defaultDep;
                  const ccFee = Math.round(effectiveDeposit * 0.03 * 100) / 100;
                  const customerTotal = effectiveDeposit + ccFee;

                  return (
                    <>
                      {/* Quote summary */}
                      <div className="p-4 rounded-lg border border-border bg-secondary/30 space-y-3">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-emerald-400" /> {t("admin.deposit.calculator")}
                        </h4>
                        {quoteTotal <= 0 ? (
                          <div className="p-3 rounded border border-amber-500/30 bg-amber-500/5">
                            <p className="text-sm text-amber-400">⚠️ {t("admin.deposit.noquote")}</p>
                          </div>
                        ) : (
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">{t("admin.deposit.quotetotal")}</span>
                              <span className="font-medium">${quoteTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">{t("admin.deposit.25pct")}</span>
                              <span className="font-medium">${defaultDep.toFixed(2)}</span>
                            </div>
                          </div>
                        )}

                        {/* Editable deposit amount */}
                        <div className="pt-2 border-t border-border">
                          <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">{t("admin.deposit.customamt")}</label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder={defaultDep > 0 ? defaultDep.toFixed(2) : "0.00"}
                              value={depositOverride}
                              onChange={(e) => setDepositOverride(e.target.value)}
                              className="h-8 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            {depositOverride !== "" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-muted-foreground"
                                onClick={() => setDepositOverride("")}
                              >
                                {t("admin.deposit.reset")}
                              </Button>
                            )}
                          </div>
                          {depositOverride !== "" && parseFloat(depositOverride) !== defaultDep && (
                            <p className="text-xs text-amber-400/80 mt-1">{t("admin.deposit.customoverride")}</p>
                          )}
                        </div>
                      </div>

                      {/* Payment breakdown */}
                      {effectiveDeposit > 0 && (
                        <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                          <h4 className="text-sm font-medium text-emerald-400">{t("admin.deposit.breakdown")}</h4>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">{t("admin.deposit.deposit")}</span>
                              <span>${effectiveDeposit.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">{t("admin.deposit.ccfee")}</span>
                              <span>${ccFee.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-border pt-2 font-semibold">
                              <span>Customer Pays</span>
                              <span>${customerTotal.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Payment options */}
                      <div className="space-y-3">
                        <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Payment Options</h4>
                        
                        {/* Zelle info */}
                        <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/5">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-purple-400">✅ Zelle (preferred — no fees)</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Customer sends ${effectiveDeposit.toFixed(2)} to (530) 966-0752</p>
                        </div>

                        {/* CC link button */}
                        <Button
                          className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                          disabled={effectiveDeposit <= 0 || sendingDepositLink}
                          onClick={async () => {
                            // Save deposit override first
                            const depVal = customDep !== null && !isNaN(customDep) ? customDep : null;
                            const savePricePayload: Record<string, unknown> = {};
                            if (depVal !== null) savePricePayload.deposit_override = depVal;
                            if (quoteTotal > 0 && !selected.total_price) savePricePayload.total_price = quoteTotal;
                            
                            if (Object.keys(savePricePayload).length > 0) {
                              await supabase.from("bookings").update(savePricePayload).eq("id", selected.id);
                            }
                            setShowDepositConfirm(true);
                          }}
                        >
                          <CreditCard className="w-4 h-4" />
                          {sendingDepositLink ? "Creating link..." : `Send CC Deposit Link ($${customerTotal.toFixed(2)})`}
                        </Button>
                      </div>

                      {/* Move to Approved */}
                      <div className="border-t border-border pt-4">
                        <p className="text-xs text-muted-foreground mb-3">Once deposit is collected (via Zelle or CC), move this inquiry to approved:</p>
                        <Button
                          onClick={() => updateStatus("approved")}
                          disabled={saving}
                          className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Deposit Collected — Move to Approved
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </TabsContent>

              {/* Messages Tab */}
              <TabsContent value="messages" className="mt-4">
                <ThreadedChat
                  bookingId={selected.id}
                  customerId={selected.customer_id || undefined}
                  customerName={selected.name}
                  customerEmail={selected.email}
                  templates={getEmailTemplates(
                    quoteAmount ? { ...selected, _quoteAmount: quoteAmount } as any : selected,
                    t
                  ).map((tmpl) => ({
                    id: tmpl.id,
                    name: tmpl.name,
                    icon: tmpl.icon,
                    color: tmpl.color.split(' ').find((c: string) => c.startsWith('text-')) || '',
                    subject: tmpl.subject(quoteAmount ? { ...selected, _quoteAmount: quoteAmount } as any : selected),
                    body: tmpl.body(quoteAmount ? { ...selected, _quoteAmount: quoteAmount } as any : selected),
                  }))}
                  initialSubject={pendingTemplateSubject}
                  initialBody={pendingTemplateBody}
                  onInitialConsumed={() => { setPendingTemplateSubject(""); setPendingTemplateBody(""); }}
                  onEmailSent={async () => {
                    if (pendingCalendarSync && selected) {
                      // Sync Google Calendar after confirm estimate email is sent
                      setSyncingCalendar(true);
                      try {
                        const { error: calError } = await supabase.functions.invoke("sync-google-calendar", {
                          body: { bookingId: selected.id, action: selected.google_calendar_event_id ? "update" : "create" },
                        });
                        if (calError) throw calError;
                        toast({ title: t("admin.cal.synced"), description: t("admin.cal.synced.desc") });
                      } catch (err) {
                        console.error("Calendar sync error:", err);
                        toast({ title: t("admin.cal.syncfail"), description: t("admin.cal.syncfail.desc"), variant: "destructive" });
                      }
                      setSyncingCalendar(false);
                      setPendingCalendarSync(false);
                    }
                  }}
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Deposit CC Link Confirmation */}
      {selected && (
        <AlertDialog open={showDepositConfirm} onOpenChange={setShowDepositConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>💳 Send Deposit CC Link</AlertDialogTitle>
              <AlertDialogDescription>
                This will create a Stripe payment link for the deposit and prepare an email draft.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {(() => {
              const quoteTotal = selected.total_price || (quoteAmount ? parseFloat(quoteAmount) : 0);
              const defaultDep = quoteTotal > 0 ? quoteTotal * 0.25 : 0;
              const customDep = depositOverride !== "" ? parseFloat(depositOverride) : null;
              const effectiveDeposit = customDep !== null && !isNaN(customDep) ? customDep : defaultDep;
              const ccFee = Math.round(effectiveDeposit * 0.03 * 100) / 100;
              const customerTotal = effectiveDeposit + ccFee;

              return (
                <div className="space-y-2 rounded-md border border-border bg-secondary/20 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Deposit</span>
                    <span>${effectiveDeposit.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">CC Processing Fee (3%)</span>
                    <span>${ccFee.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2 font-semibold">
                    <span>Customer pays</span>
                    <span>${customerTotal.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}

            <AlertDialogFooter>
              <AlertDialogCancel>Back</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  setShowDepositConfirm(false);
                  setSendingDepositLink(true);

                  try {
                    const { data, error } = await supabase.functions.invoke("create-deposit-payment", {
                      body: { bookingId: selected.id },
                    });

                    const stripeData = typeof data === "string"
                      ? (() => { try { return JSON.parse(data); } catch { return null; } })()
                      : data;

                    if (error) throw new Error((error as any)?.message || "Failed to create deposit link");
                    if (!stripeData?.checkoutUrl) throw new Error(stripeData?.error || "Payment link not returned");

                    const firstName = (selected.name ?? "").trim().split(/\s+/)[0] || "there";
                    const depAmt = Number(stripeData.depositAmount || 0).toFixed(2);
                    const fee = Number(stripeData.fee || 0).toFixed(2);
                    const totalPay = Number(stripeData.totalWithFee || 0).toFixed(2);

                    setPendingTemplateSubject("Deposit Payment Link — Maid for Chico");
                    setPendingTemplateBody(
                      `Hi ${firstName},\n\nThank you for approving your cleaning quote! To secure your appointment, please submit your 25% deposit using the link below.\n\nDeposit Amount: $${depAmt}\nCC Processing Fee (3%): $${fee}\nTotal to Pay: $${totalPay}\n\nThis link will expire in 24 hours. If you have any questions, feel free to reply to this email or call us at (530) 966-0752.\n\nThank you!\nBetty & the Maid for Chico Team`
                    );
                    setDetailTab("messages");
                    toast({ title: "💳 Deposit link ready!", description: "Review the email in the Messages tab before sending." });
                  } catch (err) {
                    const message = err instanceof Error ? err.message : "Failed to create deposit link";
                    console.error("Deposit link error:", err);
                    toast({ title: t("admin.error"), description: message, variant: "destructive" });
                  }

                  setSendingDepositLink(false);
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {sendingDepositLink ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating...
                  </span>
                ) : (
                  "Create Deposit Link"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Estimate Invite Approval */}
      <AlertDialog open={showInviteApproval} onOpenChange={(open) => {
        if (!open) {
          setShowInviteApproval(false);
          setPendingEstimateBookingId(null);
          setSelected(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.inquiry.invite.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.inquiry.invite.desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setSelected(null); }}>{t("admin.inquiry.invite.notnow")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={sendEstimateInvite}
              disabled={sendingInvite}
              className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5"
            >
              {sendingInvite ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {sendingInvite ? t("admin.inquiry.sending") : t("admin.inquiry.invite.send")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.bulk.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.bulk.delete.desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.bulk.delete.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkActioning}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkActioning ? t("admin.deleting") : t("admin.bulk.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InquiriesPipeline;
