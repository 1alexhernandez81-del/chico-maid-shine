import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import AddressAutocomplete from "@/components/ui/address-autocomplete";
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
import {
  Search, RefreshCw, ChevronLeft, ChevronRight, Eye, Plus,
  FileText, Trash2
} from "lucide-react";
import CustomerDetailDialog from "./CustomerDetailDialog";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  zip: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  booking_count?: number;
  total_spent?: number;
  last_service?: string;
};

const PAGE_SIZE = 15;

const CustomerManagement = ({ onCreateJob }: { onCreateJob?: (data: { name: string; email: string; phone: string; street: string; city: string; zip: string }) => void }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [page, setPage] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "", email: "", phone: "", street: "", city: "Chico", zip: "", notes: "",
  });
  const [adding, setAdding] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bulkActioning, setBulkActioning] = useState(false);

  const { toast } = useToast();
  const { t } = useLanguage();

  const fetchCustomers = async () => {
    setLoading(true);
    const { data: custData, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: t("admin.error"), description: t("admin.customers.loadfail"), variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: bookings } = await supabase
      .from("bookings")
      .select("customer_id, total_price, status, preferred_date")
      .not("customer_id", "is", null);

    const enriched = (custData || []).map((c: any) => {
      const custBookings = (bookings || []).filter((b: any) => b.customer_id === c.id);
      const completed = custBookings.filter((b: any) => b.status === "completed");
      return {
        ...c,
        booking_count: custBookings.length,
        total_spent: completed.reduce((sum: number, b: any) => sum + (b.total_price || 0), 0),
        last_service: completed.length > 0
          ? completed.sort((a: any, b: any) => b.preferred_date.localeCompare(a.preferred_date))[0]?.preferred_date
          : null,
      };
    });

    setCustomers(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, []);

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.name.toLowerCase().includes(s) ||
      c.email.toLowerCase().includes(s) ||
      c.phone.includes(s);
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleAdd = async () => {
    if (!newCustomer.name || !newCustomer.email || !newCustomer.phone) {
      toast({ title: t("admin.error"), description: t("admin.customers.required"), variant: "destructive" });
      return;
    }
    setAdding(true);
    const { data, error } = await supabase
      .from("customers")
      .insert({
        name: newCustomer.name,
        email: newCustomer.email,
        phone: newCustomer.phone,
        street: newCustomer.street,
        city: newCustomer.city,
        zip: newCustomer.zip,
        notes: newCustomer.notes || null,
      })
      .select()
      .single();

    if (error) {
      const msg = error.code === "23505" ? t("admin.customers.exists") : t("admin.customers.addfail");
      toast({ title: t("admin.error"), description: msg, variant: "destructive" });
    } else {
      toast({ title: t("admin.customers.added"), description: `${newCustomer.name}` });
      setCustomers((prev) => [{ ...data, booking_count: 0, total_spent: 0 }, ...prev]);
      setShowAdd(false);
      setNewCustomer({ name: "", email: "", phone: "", street: "", city: "Chico", zip: "", notes: "" });
    }
    setAdding(false);
  };

  const handleImportFromBookings = async () => {
    setImporting(true);
    const { data: bookings } = await supabase
      .from("bookings")
      .select("name, email, phone, street, city, zip")
      .is("customer_id", null);

    if (!bookings || bookings.length === 0) {
      toast({ title: t("admin.customers.nonew"), description: t("admin.customers.alllinked") });
      setImporting(false);
      setShowImport(false);
      return;
    }

    const uniqueByEmail = new Map<string, any>();
    bookings.forEach((b) => {
      if (!uniqueByEmail.has(b.email)) {
        uniqueByEmail.set(b.email, b);
      }
    });

    let imported = 0;
    for (const [email, b] of uniqueByEmail) {
      const { data: newCust, error } = await supabase
        .from("customers")
        .upsert({
          name: b.name,
          email: b.email,
          phone: b.phone,
          street: b.street,
          city: b.city,
          zip: b.zip,
        }, { onConflict: "email" })
        .select()
        .single();

      if (!error && newCust) {
        await supabase
          .from("bookings")
          .update({ customer_id: newCust.id })
          .eq("email", email)
          .is("customer_id", null);
        imported++;
      }
    }

    toast({ title: t("admin.customers.importdone"), description: `${imported} ${t("admin.customers.import")}` });
    setShowImport(false);
    fetchCustomers();
    setImporting(false);
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
      setSelectedIds(new Set(paged.map((c) => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    setBulkActioning(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from("customers")
      .delete()
      .in("id", ids);

    if (error) {
      toast({ title: t("admin.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("admin.bulk.delete"), description: `${ids.length} ${t("admin.customers.deleted.desc")}` });
      setCustomers((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
    }
    setBulkActioning(false);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg border border-border bg-card">
          <p className="text-2xl font-semibold">{customers.length}</p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.customers.total")}</p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <p className="text-2xl font-semibold">
            ${customers.reduce((s, c) => s + (c.total_spent || 0), 0).toFixed(0)}
          </p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.customers.revenue")}</p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <p className="text-2xl font-semibold">
            {customers.filter((c) => (c.booking_count || 0) > 1).length}
          </p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.customers.repeat")}</p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <p className="text-2xl font-semibold">
            {customers.filter((c) => {
              if (!c.last_service) return false;
              const d = new Date(c.last_service);
              const now = new Date();
              return (now.getTime() - d.getTime()) < 30 * 24 * 60 * 60 * 1000;
            }).length}
          </p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.customers.active30")}</p>
        </div>
      </div>

      {/* Actions */}
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
        <Button variant="outline" onClick={fetchCustomers} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> {t("admin.bookings.refresh")}
        </Button>
        <Button variant="outline" onClick={() => setShowImport(true)}>
          <FileText className="w-4 h-4 mr-2" /> {t("admin.customers.import")}
        </Button>
        <Button onClick={() => setShowAdd(true)} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
          <Plus className="w-4 h-4" /> {t("admin.customers.add")}
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
              <TableHead>{t("admin.customers.customer")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("admin.bookings.phone")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("admin.customers.location")}</TableHead>
              <TableHead>{t("admin.customers.bookings")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("admin.customers.totalspent")}</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  {loading ? t("admin.customers.loading") : t("admin.customers.nocustfound")}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-secondary/30">
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(c.id)}
                      onCheckedChange={() => toggleSelect(c.id)}
                    />
                  </TableCell>
                  <TableCell onClick={() => setSelected(c)}>
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm" onClick={() => setSelected(c)}>{c.phone}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm" onClick={() => setSelected(c)}>{c.city}, CA {c.zip}</TableCell>
                  <TableCell onClick={() => setSelected(c)}>
                    <Badge variant="outline" className="text-xs">
                      {c.booking_count || 0} {t("admin.customers.jobs")}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm font-medium text-accent" onClick={() => setSelected(c)}>
                    ${(c.total_spent || 0).toFixed(0)}
                  </TableCell>
                  <TableCell onClick={() => setSelected(c)}>
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

      {/* Customer Detail */}
      <CustomerDetailDialog
        customer={selected}
        onClose={() => setSelected(null)}
        onUpdated={() => { setSelected(null); fetchCustomers(); }}
        onCreateJob={onCreateJob}
      />

      {/* Add Customer Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.customers.addtitle")}</DialogTitle>
            <DialogDescription>{t("admin.customers.addsubtitle")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.customers.name")}</Label>
              <Input value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} placeholder="Jane Doe" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.customers.email")}</Label>
                <Input value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} placeholder="jane@example.com" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.customers.phone")}</Label>
                <Input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} placeholder="(530) 555-0123" />
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.customers.address")}</Label>
              <AddressAutocomplete
                value={newCustomer.street}
                onChange={(val) => setNewCustomer({ ...newCustomer, street: val })}
                onSelect={(addr) => setNewCustomer({ ...newCustomer, street: addr.street, city: addr.city || newCustomer.city, zip: addr.zip || newCustomer.zip })}
                placeholder="123 Main St"
                className="mb-2"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input value={newCustomer.city} onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })} placeholder="Chico" />
                <Input value={newCustomer.zip} onChange={(e) => setNewCustomer({ ...newCustomer, zip: e.target.value })} <Input value={newCustomer.zip} onChange={(e) => setNewCustomer({ ...newCustomer, zip: e.target.value })} placeholder="Zip" /> />
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.customers.notes")}</Label>
              <Textarea value={newCustomer.notes} onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })} placeholder={t("admin.customers.notes") + "..."} rows={2} />
            </div>
            <Button onClick={handleAdd} disabled={adding} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              {adding ? t("admin.customers.adding") : t("admin.customers.addbtn")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("admin.customers.importtitle")}</DialogTitle>
            <DialogDescription>{t("admin.customers.importdesc")}</DialogDescription>
          </DialogHeader>
          <Button onClick={handleImportFromBookings} disabled={importing} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            {importing ? t("admin.customers.importing") : t("admin.customers.importbtn")}
          </Button>
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
    </div>
  );
};

export default CustomerManagement;
