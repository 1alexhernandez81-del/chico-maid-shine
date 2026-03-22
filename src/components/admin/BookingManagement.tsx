import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, RefreshCw, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { STATUS_COLORS } from "./shared/utils";
import type { Booking } from "./shared/types";



const PAGE_SIZE = 15;

const BookingManagement = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const { toast } = useToast();
  const { t } = useLanguage();

  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: t("admin.error"), description: t("admin.bookings.error"), variant: "destructive" });
    } else {
      setBookings((data as Booking[]) || []);
    }
    setLoading(false);
  };

  useState(() => { fetchBookings(); });

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
    setSelected(booking);
    setAdminNotes(booking.admin_notes || "");
    setNewStatus(booking.status);
  };

  const saveChanges = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus, admin_notes: adminNotes })
      .eq("id", selected.id);

    if (error) {
      toast({ title: t("admin.error"), description: t("admin.bookings.error.update"), variant: "destructive" });
    } else {
      toast({ title: t("admin.bookings.updated"), description: t("admin.bookings.updated.msg") });
      setBookings((prev) =>
        prev.map((b) => b.id === selected.id ? { ...b, status: newStatus, admin_notes: adminNotes } : b)
      );
      setSelected(null);
    }
    setSaving(false);
  };

  const statusKeys = ["all", "pending", "confirmed", "completed", "cancelled"] as const;
  const counts: Record<string, number> = {
    all: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  const statusLabel = (s: string) => t(`admin.bookings.${s}`);

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

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
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
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  {loading ? t("admin.bookings.loading") : t("admin.bookings.none")}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((b) => (
                <TableRow key={b.id} className="cursor-pointer hover:bg-secondary/30" onClick={() => openDetail(b)}>
                  <TableCell className="text-sm">{new Date(b.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{b.name}</div>
                    <div className="text-xs text-muted-foreground">{b.email}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm capitalize">{b.service_type.replace("-", " ")}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm capitalize">{b.frequency.replace("-", " ")}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[b.status] || ""}`}>
                      {statusLabel(b.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.bookings.details")}</DialogTitle>
            <DialogDescription>{t("admin.bookings.details.desc")}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
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
                  <p className="capitalize">{selected.service_type.replace("-", " ")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.frequency")}</p>
                  <p className="capitalize">{selected.frequency.replace("-", " ")}</p>
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
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.prefdate")}</p>
                  <p>{selected.preferred_date}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.preftime")}</p>
                  <p className="capitalize">{selected.preferred_time || t("admin.bookings.nopref")}</p>
                </div>
              </div>

              {selected.notes && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.custnotes")}</p>
                  <p className="text-sm bg-secondary/50 rounded p-3">{selected.notes}</p>
                </div>
              )}

              <div className="border-t border-border pt-4 space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">{t("admin.bookings.status")}</label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t("admin.bookings.pending")}</SelectItem>
                      <SelectItem value="confirmed">{t("admin.bookings.confirmed")}</SelectItem>
                      <SelectItem value="completed">{t("admin.bookings.completed")}</SelectItem>
                      <SelectItem value="cancelled">{t("admin.bookings.cancelled")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">{t("admin.bookings.adminnotes")}</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder={t("admin.bookings.adminnotes.placeholder")}
                    rows={3}
                  />
                </div>
                <Button onClick={saveChanges} disabled={saving} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  {saving ? t("admin.bookings.saving") : t("admin.bookings.save")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingManagement;
