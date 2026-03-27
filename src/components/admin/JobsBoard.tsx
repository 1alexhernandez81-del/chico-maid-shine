import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import AddressAutocomplete from "@/components/ui/address-autocomplete";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
import { Search, RefreshCw, ChevronLeft, ChevronRight, Eye, Plus, CalendarIcon, Trash2, UserCheck, List, CalendarDays, CalendarRange, Calendar as CalendarMonthIcon, RotateCcw, Archive } from "lucide-react";
import { Label } from "@/components/ui/label";
import JobDetailDialog from "./JobDetailDialog";
import JobsCalendarView from "./JobsCalendarView";
import type { UserRole } from "@/pages/AdminDashboard";
import type { Booking } from "./shared/types";
import { STATUS_COLORS } from "./shared/utils";

type ViewMode = "list" | "day" | "week" | "month";

type Customer = {
  id: string;
  name: string;
  email: string;
};

type CleanerInfo = {
  id: string;
  name: string;
};

const JOB_STATUSES = ["approved", "scheduled", "in-progress", "completed"];

const PAGE_SIZE = 15;

const DEFAULT_NEW_JOB = {
  name: "", email: "", phone: "", street: "", city: "Chico", zip: "",
  service_type: "residential", frequency: "one-time", preferred_date: "",
  bedrooms: "", bathrooms: "", sqft: "", notes: "", admin_notes: "",
};

const JobsBoard = ({ userRole = "admin" as UserRole, prefillJob }: { userRole?: UserRole; prefillJob?: Partial<typeof DEFAULT_NEW_JOB> | null }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [page, setPage] = useState(0);
  const [showAddJob, setShowAddJob] = useState(false);
  const [newJob, setNewJob] = useState({ ...DEFAULT_NEW_JOB });
  const [addingJob, setAddingJob] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAssignCustomer, setShowAssignCustomer] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [assignCustomerId, setAssignCustomerId] = useState("");
  const [bulkActioning, setBulkActioning] = useState(false);
  const [cleanerFilter, setCleanerFilter] = useState("all");
  const [cleanersList, setCleanersList] = useState<CleanerInfo[]>([]);

  // Deleted jobs
  const [showDeletedJobs, setShowDeletedJobs] = useState(false);
  const [deletedJobs, setDeletedJobs] = useState<Booking[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const { toast } = useToast();
  const { t } = useLanguage();

  const isAdmin = userRole === "admin";

  const [pendingReschedule, setPendingReschedule] = useState<{ bookingId: string; newDate: string; bookingName: string; oldDate: string } | null>(null);

  const handleRescheduleRequest = (bookingId: string, newDate: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;
    const oldDate = booking.scheduled_date || booking.preferred_date;
    if (oldDate === newDate) return;
    setPendingReschedule({ bookingId, newDate, bookingName: booking.name, oldDate });
  };

  const confirmReschedule = async () => {
    if (!pendingReschedule) return;
    const { bookingId, newDate, bookingName } = pendingReschedule;

    const { error } = await supabase
      .from("bookings")
      .update({ scheduled_date: newDate } as any)
      .eq("id", bookingId);

    if (error) {
      toast({ title: "Error", description: "Failed to reschedule job", variant: "destructive" });
    } else {
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, scheduled_date: newDate } : b
        )
      );
      toast({
        title: "📅 Job Rescheduled",
        description: `${bookingName} moved to ${newDate}`,
      });
    }
    setPendingReschedule(null);
  };

  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .in("status", JOB_STATUSES)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: t("admin.error"), description: t("admin.bookings.error"), variant: "destructive" });
    } else {
      setBookings((data as Booking[]) || []);
    }
    setLoading(false);
    setSelectedIds(new Set());
  };

  useEffect(() => { fetchBookings(); }, []);

  // Open Add Job dialog with prefilled data (from customer page or clone)
  useEffect(() => {
    if (prefillJob) {
      setNewJob({ ...DEFAULT_NEW_JOB, ...prefillJob });
      setShowAddJob(true);
    }
  }, [prefillJob]);

  useEffect(() => {
    supabase.from("cleaners").select("id, name").eq("active", true).order("name").then(({ data }) => {
      if (data) setCleanersList(data as CleanerInfo[]);
    });
  }, []);

  const handleCloneJob = (booking: Booking) => {
    setNewJob({
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      street: booking.street,
      city: booking.city,
      zip: booking.zip,
      service_type: booking.service_type,
      frequency: booking.frequency,
      preferred_date: "",
      bedrooms: booking.bedrooms || "",
      bathrooms: booking.bathrooms || "",
      sqft: booking.sqft || "",
      notes: booking.notes || "",
      admin_notes: booking.admin_notes || "",
    });
    setShowAddJob(true);
  };

  const filtered = bookings.filter((b) => {
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    const matchesSearch = !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.email.toLowerCase().includes(search.toLowerCase()) ||
      b.phone.includes(search);
    const matchesCleaner = cleanerFilter === "all" ||
      (Array.isArray(b.assigned_cleaners) && b.assigned_cleaners.includes(cleanerFilter));
    return matchesStatus && matchesSearch && matchesCleaner;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const openDetail = (booking: Booking) => {
    setSelected(booking);
  };

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
    const { error } = await supabase
      .from("bookings")
      .update({ deleted_at: new Date().toISOString() } as any)
      .in("id", ids);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("admin.bulk.delete"), description: `${ids.length} job(s) deleted` });
      setBookings((prev) => prev.filter((b) => !selectedIds.has(b.id)));
      setSelectedIds(new Set());
    }
    setBulkActioning(false);
    setShowDeleteConfirm(false);
  };

  const fetchDeletedJobs = async () => {
    setLoadingDeleted(true);
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    setDeletedJobs((data as Booking[]) || []);
    setLoadingDeleted(false);
  };

  const restoreJob = async (id: string) => {
    setRestoringId(id);
    const { error } = await supabase
      .from("bookings")
      .update({ deleted_at: null } as any)
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Job restored!", description: "The job has been moved back." });
      setDeletedJobs((prev) => prev.filter((b) => b.id !== id));
      fetchBookings();
    }
    setRestoringId(null);
  };

  const openAssignCustomer = async () => {
    // Fetch customers for the dropdown
    const { data } = await supabase.from("customers").select("id, name, email").order("name");
    setCustomers((data || []) as Customer[]);
    setAssignCustomerId("");
    setShowAssignCustomer(true);
  };

  const handleAssignCustomer = async () => {
    if (!assignCustomerId) {
      toast({ title: "Error", description: "Select a customer", variant: "destructive" });
      return;
    }
    setBulkActioning(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from("bookings")
      .update({ customer_id: assignCustomerId })
      .in("id", ids);

    if (error) {
      toast({ title: "Error", description: "Failed to assign customer", variant: "destructive" });
    } else {
      const cust = customers.find((c) => c.id === assignCustomerId);
      toast({ title: "Jobs Assigned", description: `${ids.length} job(s) assigned to ${cust?.name || "customer"}` });
      setBookings((prev) => prev.map((b) => selectedIds.has(b.id) ? { ...b, customer_id: assignCustomerId } : b));
      setSelectedIds(new Set());
    }
    setBulkActioning(false);
    setShowAssignCustomer(false);
  };

  const handleAddJob = async () => {
    if (!newJob.name || !newJob.email || !newJob.phone || !newJob.street || !newJob.zip || !newJob.preferred_date) {
      toast({ title: t("admin.error"), description: t("admin.job.add.required"), variant: "destructive" });
      return;
    }
    setAddingJob(true);
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        name: newJob.name,
        email: newJob.email,
        phone: newJob.phone,
        street: newJob.street,
        city: newJob.city,
        zip: newJob.zip,
        service_type: newJob.service_type,
        frequency: newJob.frequency,
        preferred_date: newJob.preferred_date,
        bedrooms: newJob.bedrooms || null,
        bathrooms: newJob.bathrooms || null,
        sqft: newJob.sqft || null,
        notes: newJob.notes || null,
        admin_notes: newJob.admin_notes || null,
        status: "completed",
      })
      .select()
      .single();

    if (error) {
      toast({ title: t("admin.error"), description: t("admin.job.add.error"), variant: "destructive" });
    } else {
      toast({ title: t("admin.job.add.success"), description: t("admin.job.add.success.msg") });
      setBookings((prev) => [data as Booking, ...prev]);
      setShowAddJob(false);
      setNewJob({ ...DEFAULT_NEW_JOB });
    }
    setAddingJob(false);
  };

  const statusKeys = ["all", ...JOB_STATUSES] as const;
  const counts: Record<string, number> = {
    all: bookings.length,
    approved: bookings.filter((b) => b.status === "approved").length,
    scheduled: bookings.filter((b) => b.status === "scheduled").length,
    "in-progress": bookings.filter((b) => b.status === "in-progress").length,
    completed: bookings.filter((b) => b.status === "completed").length,
  };

  const statusLabel = (s: string) => t(`admin.job.${s}`);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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

      {/* Filters + View Toggle */}
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

        {/* Cleaner filter */}
        {cleanersList.length > 0 && (
          <Select value={cleanerFilter} onValueChange={(v) => { setCleanerFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t("admin.cleaners.all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.cleaners.all")}</SelectItem>
              {cleanersList.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* View mode toggle */}
        <div className="flex border border-border rounded-lg overflow-hidden">
          {([
            { mode: "list" as ViewMode, icon: List, label: t("admin.view.list") },
            { mode: "day" as ViewMode, icon: CalendarDays, label: t("admin.view.day") },
            { mode: "week" as ViewMode, icon: CalendarRange, label: t("admin.view.week") },
            { mode: "month" as ViewMode, icon: CalendarMonthIcon, label: t("admin.view.month") },
          ]).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                viewMode === mode
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-secondary text-muted-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <Button variant="outline" onClick={fetchBookings} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> {t("admin.bookings.refresh")}
        </Button>
        {isAdmin && (
          <Button onClick={() => setShowAddJob(true)} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
            <Plus className="w-4 h-4" /> {t("admin.job.add")}
          </Button>
        )}
      </div>

      {/* Bulk action bar */}
      {isAdmin && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-accent/30 bg-accent/5">
          <span className="text-sm font-medium">{selectedIds.size} {t("admin.bulk.selected")}</span>
          <Button variant="outline" size="sm" onClick={openAssignCustomer} className="gap-1.5">
            <UserCheck className="w-3.5 h-3.5" /> {t("admin.bulk.assign")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(true)} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
            <Trash2 className="w-3.5 h-3.5" /> {t("admin.bulk.delete")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs">
            {t("admin.bulk.clear")}
          </Button>
        </div>
      )}

      {/* Calendar Views */}
      {viewMode !== "list" && (
        <JobsCalendarView
          bookings={filtered as any}
          mode={viewMode}
          onSelectJob={(b) => openDetail(b as any)}
          onReschedule={isAdmin ? handleRescheduleRequest : undefined}
        />
      )}

      {/* Table — list view only */}
      {viewMode === "list" && (
        <>
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  {isAdmin && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={paged.length > 0 && selectedIds.size === paged.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>{t("admin.bookings.date")}</TableHead>
                  <TableHead>{t("admin.bookings.name")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("admin.bookings.service")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("admin.bookings.frequency")}</TableHead>
                  <TableHead>{t("admin.bookings.status")}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground py-12">
                      {loading ? t("admin.bookings.loading") : t("admin.job.none")}
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((b) => (
                    <TableRow key={b.id} className="cursor-pointer hover:bg-secondary/30">
                      {isAdmin && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(b.id)}
                            onCheckedChange={() => toggleSelect(b.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="text-sm" onClick={() => openDetail(b)}>{new Date(b.created_at).toLocaleDateString()}</TableCell>
                      <TableCell onClick={() => openDetail(b)}>
                        <div className="font-medium text-sm">{b.name}</div>
                        <div className="text-xs text-muted-foreground">{b.email}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm capitalize" onClick={() => openDetail(b)}>{b.service_type.replace("-", " ")}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm capitalize" onClick={() => openDetail(b)}>{b.frequency.replace("-", " ")}</TableCell>
                      <TableCell onClick={() => openDetail(b)}>
                        <Badge variant="outline" className={`text-xs ${STATUS_COLORS[b.status] || ""}`}>
                          {statusLabel(b.status)}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {!isAdmin && b.status === "scheduled" && !b.accepted_by && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const { data: { session } } = await supabase.auth.getSession();
                                if (!session) return;
                                const { error } = await supabase
                                  .from("bookings")
                                  .update({ accepted_by: session.user.id } as any)
                                  .eq("id", b.id);
                                if (!error) {
                                  setBookings((prev) => prev.map((bk) => bk.id === b.id ? { ...bk, accepted_by: session.user.id } : bk));
                                  toast({ title: "✅ Job Accepted" });
                                }
                              }}
                            >
                              ✋ Accept
                            </Button>
                          )}
                          {!isAdmin && b.accepted_by && (
                            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                              Accepted
                            </Badge>
                          )}
                          <Eye className="w-4 h-4 text-muted-foreground cursor-pointer" onClick={() => openDetail(b)} />
                        </div>
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
        </>
      )}

      {/* Detail Dialog */}
      <JobDetailDialog
        booking={selected}
        onClose={() => setSelected(null)}
        onUpdated={(updated) => {
          const inquiryStatuses = ["pending", "contacted", "estimate-scheduled", "quoted", "declined"];
          if (inquiryStatuses.includes(updated.status)) {
            // Moved back to inquiry — remove from jobs list
            setBookings((prev) => prev.filter((b) => b.id !== updated.id));
          } else {
            setBookings((prev) => prev.map((b) => b.id === updated.id ? updated : b));
          }
          setSelected(null);
        }}
        userRole={userRole}
        onClone={handleCloneJob}
      />

      {/* Add Job Dialog */}
      <Dialog open={showAddJob} onOpenChange={setShowAddJob}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.job.add.title")}</DialogTitle>
            <DialogDescription>{t("admin.job.add.desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.bookings.name")}</Label>
                <Input value={newJob.name} onChange={(e) => setNewJob({ ...newJob, name: e.target.value })} placeholder="" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.bookings.phone")}</Label>
                <Input value={newJob.phone} onChange={(e) => setNewJob({ ...newJob, phone: e.target.value })} placeholder="" />
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.bookings.email")}</Label>
              <Input value={newJob.email} onChange={(e) => setNewJob({ ...newJob, email: e.target.value })} placeholder="" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.bookings.address")}</Label>
              <AddressAutocomplete
                value={newJob.street}
                onChange={(val) => setNewJob({ ...newJob, street: val })}
                onSelect={(addr) => setNewJob({ ...newJob, street: addr.street, city: addr.city || newJob.city, zip: addr.zip || newJob.zip })}
                placeholder=""
                className="mb-2"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input value={newJob.city} onChange={(e) => setNewJob({ ...newJob, city: e.target.value })} placeholder="Chico" />
                <Input value={newJob.zip} onChange={(e) => setNewJob({ ...newJob, zip: e.target.value })} placeholder="Zip" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.bookings.service")}</Label>
                <Select value={newJob.service_type} onValueChange={(v) => setNewJob({ ...newJob, service_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="one-time">One-Time</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.bookings.frequency")}</Label>
                <Select value={newJob.frequency} onValueChange={(v) => setNewJob({ ...newJob, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-time">One-Time</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                    <SelectItem value="every-3-weeks">Every 3 Weeks</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.bookings.bedrooms")}</Label>
                <Select value={newJob.bedrooms} onValueChange={(v) => setNewJob({ ...newJob, bedrooms: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {["0", "1", "2", "3", "4", "5+"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.bookings.bathrooms")}</Label>
                <Select value={newJob.bathrooms} onValueChange={(v) => setNewJob({ ...newJob, bathrooms: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {["0", "1", "2", "3", "4", "5+"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.bookings.sqft")}</Label>
                <Input value={newJob.sqft} onChange={(e) => setNewJob({ ...newJob, sqft: e.target.value })} placeholder="1,200" />
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.bookings.prefdate")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={`w-full justify-start text-left font-normal ${!newJob.preferred_date ? "text-muted-foreground" : ""}`}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newJob.preferred_date ? format(new Date(newJob.preferred_date + "T12:00:00"), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newJob.preferred_date ? new Date(newJob.preferred_date + "T12:00:00") : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const y = date.getFullYear();
                        const m = String(date.getMonth() + 1).padStart(2, "0");
                        const d = String(date.getDate()).padStart(2, "0");
                        setNewJob({ ...newJob, preferred_date: `${y}-${m}-${d}` });
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.bookings.adminnotes")}</Label>
              <Textarea value={newJob.admin_notes} onChange={(e) => setNewJob({ ...newJob, admin_notes: e.target.value })} placeholder={t("admin.bookings.adminnotes.placeholder")} rows={2} />
            </div>
            <Button onClick={handleAddJob} disabled={addingJob} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              {addingJob ? t("admin.bookings.saving") : t("admin.job.add.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
              {bulkActioning ? t("admin.bulk.deleting") : t("admin.bulk.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign to Customer Dialog */}
      <Dialog open={showAssignCustomer} onOpenChange={setShowAssignCustomer}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("admin.bulk.assign.title")}</DialogTitle>
            <DialogDescription>
              {t("admin.bulk.assign.desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={assignCustomerId} onValueChange={setAssignCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin.bulk.assign.select")} />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAssignCustomer}
              disabled={bulkActioning || !assignCustomerId}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {bulkActioning ? t("admin.bulk.assigning") : t("admin.bulk.assign.btn")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule confirmation dialog */}
      <AlertDialog open={!!pendingReschedule} onOpenChange={(open) => !open && setPendingReschedule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.reschedule.confirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.reschedule.confirm.description")
                .replace("{name}", pendingReschedule?.bookingName || "")
                .replace("{oldDate}", pendingReschedule?.oldDate || "")
                .replace("{newDate}", pendingReschedule?.newDate || "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReschedule}>{t("admin.reschedule.confirm.btn")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default JobsBoard;
