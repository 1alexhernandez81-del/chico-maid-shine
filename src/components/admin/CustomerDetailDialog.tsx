import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import AddressAutocomplete from "@/components/ui/address-autocomplete";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Mail, MessageSquare, Calendar, DollarSign, Plus, Repeat, Trash2, Clock, Pencil, Save, X, CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import JobDetailDialog from "./JobDetailDialog";
import ThreadedChat from "./ThreadedChat";
import { STATUS_COLORS } from "./shared/utils";
import type { Booking } from "./shared/types";

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
};


type Communication = {
  id: string;
  type: string;
  subject: string | null;
  body: string | null;
  created_at: string;
};

type RecurringSchedule = {
  id: string;
  service_type: string;
  frequency: string;
  preferred_day: string | null;
  preferred_time: string | null;
  street: string;
  city: string;
  zip: string;
  price: number | null;
  active: boolean;
  next_service_date: string | null;
};

interface Props {
  customer: Customer | null;
  onClose: () => void;
  onUpdated: () => void;
}


const CustomerDetailDialog = ({ customer, onClose, onUpdated }: Props) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  // Edit customer info
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", street: "", city: "", zip: "" });

  // Job detail from history
  const [selectedJob, setSelectedJob] = useState<Booking | null>(null);

  // Note form
  const [noteBody, setNoteBody] = useState("");

  // Schedule form
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    service_type: "residential",
    frequency: "weekly",
    preferred_day: "monday",
    preferred_time: "09:00",
    price: "",
  });

  // Generate 30-min time slots from 8:00 AM to 5:00 PM
  const timeSlots = Array.from({ length: 19 }, (_, i) => {
    const totalMinutes = 8 * 60 + i * 30;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    const period = hours >= 12 ? "PM" : "AM";
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    const label = `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;
    return { value, label };
  });

  const formatTimeDisplay = (time: string | null) => {
    if (!time) return t("admin.cd.flexible");
    const slot = timeSlots.find((s) => s.value === time);
    if (slot) return slot.label;
    return time.charAt(0).toUpperCase() + time.slice(1);
  };
  const [addingSchedule, setAddingSchedule] = useState(false);

  useEffect(() => {
    if (!customer) return;
    setEditNotes(customer.notes || "");
    setEditForm({
      name: customer.name, email: customer.email, phone: customer.phone,
      street: customer.street, city: customer.city, zip: customer.zip,
    });
    setEditing(false);
    setLoading(true);

    Promise.all([
      supabase.from("bookings").select("*")
        .eq("customer_id", customer.id).order("created_at", { ascending: false }),
      supabase.from("customer_communications").select("*")
        .eq("customer_id", customer.id).order("created_at", { ascending: false }),
      supabase.from("recurring_schedules").select("*")
        .eq("customer_id", customer.id).order("created_at", { ascending: false }),
    ]).then(([bookRes, commRes, schedRes]) => {
      setBookings((bookRes.data || []) as Booking[]);
      setCommunications((commRes.data || []) as Communication[]);
      setSchedules((schedRes.data || []) as RecurringSchedule[]);
      setLoading(false);
    });
  }, [customer]);

  if (!customer) return null;

  const totalSpent = bookings
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  const saveNotes = async () => {
    setSaving(true);
    await supabase.from("customers").update({ notes: editNotes }).eq("id", customer.id);
    toast({ title: t("admin.cd.saved"), description: t("admin.cd.notesupdated") });
    setSaving(false);
  };

  const saveCustomerEdit = async () => {
    setSaving(true);
    const { error } = await supabase.from("customers").update({
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
      street: editForm.street,
      city: editForm.city,
      zip: editForm.zip,
    }).eq("id", customer.id);

    if (error) {
      toast({ title: t("admin.error"), description: t("admin.cd.updatefail"), variant: "destructive" });
    } else {
      toast({ title: t("admin.cd.saved"), description: t("admin.cd.infoupdated") });
      setEditing(false);
      onUpdated();
    }
    setSaving(false);
  };

  const addNote = async () => {
    if (!noteBody) return;
    await supabase.from("customer_communications").insert({
      customer_id: customer.id,
      type: "note",
      body: noteBody,
    });
    setNoteBody("");
    const { data } = await supabase.from("customer_communications").select("*")
      .eq("customer_id", customer.id).order("created_at", { ascending: false });
    setCommunications((data || []) as Communication[]);
    toast({ title: t("admin.cd.noteadded") });
  };

  const computeNextServiceDate = (preferredDay: string) => {
    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };
    const target = dayMap[preferredDay.toLowerCase()];
    const now = new Date();
    const current = now.getDay();
    let daysUntil = target - current;
    if (daysUntil <= 0) daysUntil += 7;
    const next = new Date(now);
    next.setDate(now.getDate() + daysUntil);
    return next.toISOString().split("T")[0];
  };

  const addSchedule = async () => {
    setAddingSchedule(true);
    const nextDate = computeNextServiceDate(newSchedule.preferred_day);
    const { error } = await supabase.from("recurring_schedules").insert({
      customer_id: customer.id,
      service_type: newSchedule.service_type,
      frequency: newSchedule.frequency,
      preferred_day: newSchedule.preferred_day,
      preferred_time: newSchedule.preferred_time,
      street: customer.street,
      city: customer.city,
      zip: customer.zip,
      price: newSchedule.price ? parseFloat(newSchedule.price) : null,
      next_service_date: nextDate,
    });

    if (error) {
      toast({ title: t("admin.error"), description: t("admin.cd.schedulefail"), variant: "destructive" });
    } else {
      toast({ title: t("admin.cd.scheduleadded") });
      setShowAddSchedule(false);
      setNewSchedule({ service_type: "residential", frequency: "weekly", preferred_day: "monday", preferred_time: "09:00", price: "" });
      const { data } = await supabase.from("recurring_schedules").select("*")
        .eq("customer_id", customer.id).order("created_at", { ascending: false });
      setSchedules((data || []) as RecurringSchedule[]);
    }
    setAddingSchedule(false);
  };

  const toggleScheduleActive = async (scheduleId: string, active: boolean) => {
    await supabase.from("recurring_schedules").update({ active: !active }).eq("id", scheduleId);
    setSchedules((prev) => prev.map((s) => s.id === scheduleId ? { ...s, active: !active } : s));
  };

  const deleteSchedule = async (scheduleId: string) => {
    await supabase.from("recurring_schedules").delete().eq("id", scheduleId);
    setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
    toast({ title: t("admin.cd.scheduleremoved") });
  };

  return (
    <>
      <Dialog open={!!customer} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <span>{editing ? t("admin.cd.editcustomer") : customer.name}</span>
                </DialogTitle>
                <DialogDescription className="flex flex-wrap gap-3 text-sm mt-1">
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {customer.email}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {customer.phone}</span>
                  <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> ${totalSpent.toFixed(0)} {t("admin.cd.total")}</span>
                </DialogDescription>
              </div>
              {!editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5 shrink-0">
                  <Pencil className="w-3.5 h-3.5" /> {t("admin.cd.edit")}
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Inline Edit Form */}
          {editing && (
            <div className="space-y-3 border border-border rounded-lg p-4 bg-secondary/30">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{t("admin.cd.name")}</Label>
                  <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("admin.cd.phone")}</Label>
                  <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("admin.cd.email")}</Label>
                <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("admin.cd.address")}</Label>
                <AddressAutocomplete
                  value={editForm.street}
                  onChange={(val) => setEditForm({ ...editForm, street: val })}
                  onSelect={(addr) => setEditForm({ ...editForm, street: addr.street, city: addr.city || editForm.city, zip: addr.zip || editForm.zip })}
                  placeholder={t("admin.cd.street")}
                  className="mb-2"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} placeholder={t("admin.cd.city")} />
                  <Input value={editForm.zip} onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })} placeholder={t("admin.cd.zip")} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveCustomerEdit} disabled={saving} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5">
                  <Save className="w-3.5 h-3.5" /> {saving ? t("admin.cd.saving") : t("admin.cd.save")}
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)} className="gap-1.5">
                  <X className="w-3.5 h-3.5" /> {t("admin.cd.cancel")}
                </Button>
              </div>
            </div>
          )}

          <Tabs defaultValue="history" className="mt-2">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="history" className="gap-1.5 text-xs"><Calendar className="w-3.5 h-3.5" /> {t("admin.cd.tab.history")}</TabsTrigger>
              <TabsTrigger value="messages" className="gap-1.5 text-xs"><Mail className="w-3.5 h-3.5" /> {t("admin.cd.tab.messages")}</TabsTrigger>
              <TabsTrigger value="schedule" className="gap-1.5 text-xs"><Repeat className="w-3.5 h-3.5" /> {t("admin.cd.tab.schedule")}</TabsTrigger>
              <TabsTrigger value="notes" className="gap-1.5 text-xs"><MessageSquare className="w-3.5 h-3.5" /> {t("admin.cd.tab.notes")}</TabsTrigger>
            </TabsList>

            {/* Booking History */}
            <TabsContent value="history" className="space-y-4 mt-4">
              {bookings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t("admin.cd.nohistory")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/50">
                      <TableHead className="text-xs">{t("admin.cd.date")}</TableHead>
                      <TableHead className="text-xs">{t("admin.cd.service")}</TableHead>
                      <TableHead className="text-xs">{t("admin.cd.status")}</TableHead>
                      <TableHead className="text-xs text-right">{t("admin.cd.price")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((b) => (
                      <TableRow
                        key={b.id}
                        className="cursor-pointer hover:bg-secondary/30"
                        onClick={() => setSelectedJob(b)}
                      >
                        <TableCell className="text-sm">{b.preferred_date}</TableCell>
                        <TableCell className="text-sm capitalize">{b.service_type.replace("-", " ")}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[b.status] || ""}`}>
                            {b.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-right">
                          {b.total_price ? `$${b.total_price.toFixed(0)}` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Messages — Threaded Chat */}
            <TabsContent value="messages" className="mt-4">
              <ThreadedChat
                customerId={customer.id}
                bookingIds={bookings.map((b) => b.id)}
                customerName={customer.name}
                customerEmail={customer.email}
                templates={[]}
              />
            </TabsContent>

            {/* Recurring Schedules */}
            <TabsContent value="schedule" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {schedules.length === 0 ? t("admin.cd.noschedules") : `${schedules.filter((s) => s.active).length} ${t("admin.cd.activeschedules")}`}
                </p>
                <Button variant="outline" size="sm" onClick={() => setShowAddSchedule(true)} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> {t("admin.cd.addschedule")}
                </Button>
              </div>

              {schedules.map((s) => (
                <div key={s.id} className={`p-4 rounded-lg border ${s.active ? "border-accent/30 bg-accent/5" : "border-border bg-secondary/30 opacity-60"}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm capitalize">{s.service_type.replace("-", " ")}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">
                        {s.frequency.replace("-", " ")} · {s.preferred_day || "Flexible"} · {formatTimeDisplay(s.preferred_time)}
                      </p>
                      {s.price && <p className="text-accent font-medium text-sm mt-1">${s.price}{t("admin.cd.pervisit")}</p>}
                      {s.active && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-muted-foreground">📅 {t("admin.cd.next")}</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground gap-1">
                                {s.next_service_date
                                  ? new Date(s.next_service_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
                                  : t("admin.cd.setdate")}
                                <Pencil className="w-3 h-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarWidget
                                mode="single"
                                selected={s.next_service_date ? new Date(s.next_service_date + "T00:00:00") : undefined}
                                onSelect={async (date) => {
                                  if (!date) return;
                                  const iso = format(date, "yyyy-MM-dd");
                                  await supabase.from("recurring_schedules").update({ next_service_date: iso }).eq("id", s.id);
                                  setSchedules(prev => prev.map(sc => sc.id === s.id ? { ...sc, next_service_date: iso } : sc));
                                  toast({ title: t("admin.cd.dateupdated") });
                                }}
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleScheduleActive(s.id, s.active)}
                        className="h-8 text-xs"
                      >
                        {s.active ? t("admin.cd.pause") : t("admin.cd.resume")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSchedule(s.id)}
                        className="h-8 text-xs text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {showAddSchedule && (
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium">{t("admin.cd.newschedule")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">{t("admin.cd.servicelabel")}</Label>
                      <Select value={newSchedule.service_type} onValueChange={(v) => setNewSchedule({ ...newSchedule, service_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="residential">{t("admin.cd.residential")}</SelectItem>
                          <SelectItem value="commercial">{t("admin.cd.commercial")}</SelectItem>
                          <SelectItem value="construction">{t("admin.cd.construction")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t("admin.cd.frequency")}</Label>
                      <Select value={newSchedule.frequency} onValueChange={(v) => setNewSchedule({ ...newSchedule, frequency: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">{t("admin.cd.weekly")}</SelectItem>
                          <SelectItem value="bi-weekly">{t("admin.cd.biweekly")}</SelectItem>
                          <SelectItem value="every-3-weeks">{t("admin.cd.every3weeks")}</SelectItem>
                          <SelectItem value="monthly">{t("admin.cd.monthly")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t("admin.cd.day")}</Label>
                      <Select value={newSchedule.preferred_day} onValueChange={(v) => setNewSchedule({ ...newSchedule, preferred_day: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((d) => (
                            <SelectItem key={d} value={d}>{t(`admin.day.${d}`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t("admin.cd.time")}</Label>
                      <Select value={newSchedule.preferred_time} onValueChange={(v) => setNewSchedule({ ...newSchedule, preferred_time: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-60">
                          {timeSlots.map((slot) => (
                            <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("admin.cd.pricepervisit")}</Label>
                    <Input
                      type="number"
                      value={newSchedule.price}
                      onChange={(e) => setNewSchedule({ ...newSchedule, price: e.target.value })}
                      placeholder="150"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={addSchedule} disabled={addingSchedule} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                      {addingSchedule ? t("admin.cd.adding") : t("admin.cd.addschedule")}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddSchedule(false)}>{t("admin.cd.cancel")}</Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Notes */}
            <TabsContent value="notes" className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Input
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Add a quick note..."
                  onKeyDown={(e) => e.key === "Enter" && addNote()}
                />
                <Button variant="outline" onClick={addNote} disabled={!noteBody}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Internal Notes</Label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Detailed internal notes about this customer..."
                  rows={3}
                />
                <Button variant="outline" size="sm" onClick={saveNotes} disabled={saving} className="mt-2">
                  {saving ? "Saving..." : "Save Notes"}
                </Button>
              </div>

              {communications.length > 0 && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Activity Log</p>
                  <div className="space-y-2">
                    {communications.map((c) => (
                      <div key={c.id} className="flex gap-3 p-2.5 rounded-lg bg-secondary/30 text-sm">
                        <div className="mt-0.5">
                          {c.type === "email" ? <Mail className="w-3.5 h-3.5 text-accent" /> :
                           c.type === "call" ? <Clock className="w-3.5 h-3.5 text-blue-400" /> :
                           <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          {c.subject && <p className="font-medium text-xs">{c.subject}</p>}
                          <p className="text-muted-foreground text-xs">{c.body}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Job Detail from History */}
      <JobDetailDialog
        booking={selectedJob}
        onClose={() => setSelectedJob(null)}
        onUpdated={(updated) => {
          setBookings((prev) => prev.map((b) => b.id === updated.id ? updated : b));
          setSelectedJob(null);
        }}
      />
    </>
  );
};

export default CustomerDetailDialog;
