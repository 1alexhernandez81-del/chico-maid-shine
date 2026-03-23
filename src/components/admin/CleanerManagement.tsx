import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Pencil, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type Cleaner = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  created_at: string;
};

const CleanerManagement = () => {
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editCleaner, setEditCleaner] = useState<Cleaner | null>(null);
  const [deleteCleaner, setDeleteCleaner] = useState<Cleaner | null>(null);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const fetchCleaners = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cleaners")
      .select("*")
      .order("name");
    if (error) {
      toast({ title: t("admin.error"), description: t("admin.cleaners.loadfail"), variant: "destructive" });
    } else {
      setCleaners((data || []) as Cleaner[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCleaners(); }, []);

  const handleAdd = async () => {
    if (!form.name.trim()) {
      toast({ title: t("admin.error"), description: t("admin.cleaners.required"), variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("cleaners")
      .insert({ name: form.name.trim(), phone: form.phone.trim() })
      .select()
      .single();
    if (error) {
      toast({ title: t("admin.error"), description: error.message, variant: "destructive" });
    } else {
      setCleaners((prev) => [...prev, data as Cleaner].sort((a, b) => a.name.localeCompare(b.name)));
      setShowAdd(false);
      setForm({ name: "", phone: "" });
      toast({ title: t("admin.cleaners.added"), description: `${(data as Cleaner).name} ${t("admin.cleaners.added.desc")}` });
    }
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!editCleaner || !form.name.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("cleaners")
      .update({ name: form.name.trim(), phone: form.phone.trim() })
      .eq("id", editCleaner.id);
    if (error) {
      toast({ title: t("admin.error"), description: error.message, variant: "destructive" });
    } else {
      setCleaners((prev) =>
        prev.map((c) => c.id === editCleaner.id ? { ...c, name: form.name.trim(), phone: form.phone.trim() } : c)
      );
      setEditCleaner(null);
      toast({ title: t("admin.cleaners.updated"), description: t("admin.cleaners.updated.desc") });
    }
    setSaving(false);
  };

  const handleToggleActive = async (cleaner: Cleaner) => {
    const { error } = await supabase
      .from("cleaners")
      .update({ active: !cleaner.active })
      .eq("id", cleaner.id);
    if (!error) {
      setCleaners((prev) =>
        prev.map((c) => c.id === cleaner.id ? { ...c, active: !c.active } : c)
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteCleaner) return;
    const { error } = await supabase
      .from("cleaners")
      .delete()
      .eq("id", deleteCleaner.id);
    if (error) {
      toast({ title: t("admin.error"), description: error.message, variant: "destructive" });
    } else {
      setCleaners((prev) => prev.filter((c) => c.id !== deleteCleaner.id));
      toast({ title: t("admin.cleaners.deleted"), description: `${deleteCleaner.name} ${t("admin.cleaners.deleted.desc")}` });
    }
    setDeleteCleaner(null);
  };

  const openEdit = (cleaner: Cleaner) => {
    setForm({ name: cleaner.name, phone: cleaner.phone });
    setEditCleaner(cleaner);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("admin.cleaners.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("admin.cleaners.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCleaners} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> {t("admin.cleaners.refresh")}
          </Button>
          <Button onClick={() => { setForm({ name: "", phone: "" }); setShowAdd(true); }} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
            <Plus className="w-4 h-4" /> {t("admin.cleaners.add")}
          </Button>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead>{t("admin.cleaners.name")}</TableHead>
              <TableHead>{t("admin.cleaners.phone")}</TableHead>
              <TableHead>{t("admin.cleaners.status")}</TableHead>
              <TableHead className="w-24">{t("admin.cleaners.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cleaners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                  {loading ? t("admin.cleaners.loading") : t("admin.cleaners.empty")}
                </TableCell>
              </TableRow>
            ) : (
              cleaners.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.phone || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={c.active}
                        onCheckedChange={() => handleToggleActive(c)}
                      />
                      <Badge variant="outline" className={c.active ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground"}>
                        {c.active ? t("admin.cleaners.active") : t("admin.cleaners.inactive")}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)} className="h-7 w-7 p-0">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteCleaner(c)} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("admin.cleaners.add.title")}</DialogTitle>
            <DialogDescription>{t("admin.cleaners.add.desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("admin.cleaners.name")} *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Maria Garcia" />
            </div>
            <div>
              <Label>{t("admin.cleaners.phone")}</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(530) 555-0123" />
            </div>
            <Button onClick={handleAdd} disabled={saving} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? t("admin.cleaners.adding") : t("admin.cleaners.add.btn")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editCleaner} onOpenChange={(open) => !open && setEditCleaner(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("admin.cleaners.edit.title")}</DialogTitle>
            <DialogDescription>{t("admin.cleaners.edit.desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("admin.cleaners.name")} *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>{t("admin.cleaners.phone")}</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <Button onClick={handleEdit} disabled={saving} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? t("admin.cleaners.saving") : t("admin.cleaners.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCleaner} onOpenChange={(open) => !open && setDeleteCleaner(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.cleaners.remove")} {deleteCleaner?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.cleaners.remove.desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.bulk.delete.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("admin.bulk.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CleanerManagement;
