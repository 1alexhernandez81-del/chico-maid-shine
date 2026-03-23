import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { Plus, Trash2, Upload, FileText, DollarSign, Camera, X, Image, Sparkles, Send, MessageSquare, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { UserRole } from "@/pages/AdminDashboard";
import ThreadedChat from "@/components/admin/ThreadedChat";
import { formatLabel } from "./shared/utils";
import type { Booking, LineItem, Cleaner } from "./shared/types";

interface JobDetailDialogProps {
  booking: Booking | null;
  onClose: () => void;
  onUpdated: (updated: Booking) => void;
  userRole?: UserRole;
}

const JobDetailDialog = ({ booking, onClose, onUpdated, userRole = "admin" }: JobDetailDialogProps) => {
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [showReviewConfirm, setShowReviewConfirm] = useState(false);
  const [showScheduleConfirm, setShowScheduleConfirm] = useState(false);
  const [showApprovalConfirm, setShowApprovalConfirm] = useState(false);
  const [showRescheduleConfirm, setShowRescheduleConfirm] = useState(false);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [assignedCleanerIds, setAssignedCleanerIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  const isAdmin = userRole === "admin";

  // Pending template for quick-email buttons
  const [pendingTemplateSubject, setPendingTemplateSubject] = useState("");
  const [pendingTemplateBody, setPendingTemplateBody] = useState("");

  // Track initial values to detect dirty state
  const initialRef = useRef({ adminNotes: "", status: "", lineItems: "" });

  useEffect(() => {
    if (booking) {
      const notes = booking.admin_notes || "";
      const items = Array.isArray(booking.line_items) && booking.line_items.length > 0
        ? booking.line_items
        : [{ description: "", amount: 0 }];
      setAdminNotes(notes);
      setNewStatus(booking.status);
      setLineItems(items);
      setScheduledDate(booking.scheduled_date || booking.preferred_date || "");
      setScheduledTime(booking.scheduled_time || booking.preferred_time || "09:00");
      setInvoiceUrl(booking.invoice_url);
      setPhotos(Array.isArray(booking.photos) ? booking.photos : []);
      setAssignedCleanerIds(Array.isArray(booking.assigned_cleaners) ? booking.assigned_cleaners : []);
      initialRef.current = {
        adminNotes: notes,
        status: booking.status,
        lineItems: JSON.stringify(items),
      };
      // Reset messaging state
      setPendingTemplateSubject("");
      setPendingTemplateBody("");
    }
  }, [booking]);


  const getJobEmailTemplates = () => {
    if (!booking) return [];
    const name = (booking.name ?? "").trim().split(/\s+/)[0] || "there";
    const serviceLabel = formatLabel(booking.service_type);
    const frequencyLabel = formatLabel(booking.frequency);

    return [
      {
        id: "cleaning-scheduled",
        name: "Cleaning Scheduled",
        color: "text-green-400",
        subject: `Your Cleaning is Booked! — ${booking.preferred_date}`,
        body: `Exciting news — your cleaning has been scheduled! 🎉\n\n📅 Date: ${booking.scheduled_date || booking.preferred_date}\n🕐 Time: ${booking.scheduled_time || booking.preferred_time || "TBD"}\n📍 Address: ${booking.street}, ${booking.city}, CA ${booking.zip}\n🏠 Service: ${serviceLabel}\n\n✅ Your 25% deposit has been received — your spot is confirmed! The remaining balance is due on the day of your cleaning.\n\nHere are a few things to keep in mind:\n• Please make sure we have access to your home at the scheduled time\n• Secure any pets if applicable\n• Let us know if there are any special instructions\n\nIf you need to reschedule, please let us know at least 24 hours in advance.\n\nWe look forward to making your home sparkle!\nBetty & the Maid for Chico Team`,
      },
      {
        id: "reschedule-notice",
        name: "Reschedule Notice",
        color: "text-amber-400",
        subject: "Reschedule Request — Maid for Chico",
        body: `We wanted to reach out regarding your upcoming appointment. Unfortunately, we need to reschedule your service.\n\n📍 Address: ${booking.street}, ${booking.city}, CA ${booking.zip}\n📅 Original Date: ${booking.scheduled_date || booking.preferred_date}\n\nWe sincerely apologize for any inconvenience. Please reply with a few dates and times that work for you and we'll get you rebooked right away.\n\nThank you for your understanding!\nBetty & the Maid for Chico Team`,
      },
      {
        id: "thank-you",
        name: "Thank You",
        color: "text-pink-400",
        subject: "Thank You from Maid for Chico! 💛",
        body: `Thank you so much for choosing Maid for Chico! We hope your home is looking and feeling fresh. ✨\n\nIf you have a moment, we'd truly appreciate a quick review — it helps us grow and serve more families like yours:\n\n⭐ Google: https://g.page/r/maidforchico/review\n⭐ Yelp: https://yelp.com/biz/maid-for-chico\n\nAlso, did you know about our referral program? Refer a friend and you BOTH get $25 off your next cleaning! Share this link: https://maidforchico.com/refer\n\nWe'd love to see you again!\nBetty & the Maid for Chico Team`,
      },
      {
        id: "general-followup",
        name: "General Follow-up",
        color: "text-slate-400",
        subject: "Following Up — Maid for Chico",
        body: `We wanted to follow up on your recent service. We'd love to help get your home cleaned again!\n\nIs there anything we can answer or help with? We're happy to work around your schedule.\n\nFeel free to reply to this email or call us at (530) 966-0752.\n\nLooking forward to hearing from you!\nBetty & the Maid for Chico Team`,
      },
    ];
  };

  useEffect(() => {
    supabase.from("cleaners").select("id, name, active").order("name").then(({ data }) => {
      if (data) setCleaners(data as Cleaner[]);
    });
  }, []);

  const isDirty = useCallback(() => {
    if (!booking) return false;
    return (
      adminNotes !== initialRef.current.adminNotes ||
      newStatus !== initialRef.current.status ||
      JSON.stringify(lineItems) !== initialRef.current.lineItems
    );
  }, [adminNotes, newStatus, lineItems, booking]);

  const handleClose = () => {
    if (isDirty()) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  };

  if (!booking) return null;

  const total = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const addLineItem = () => setLineItems((prev) => [...prev, { description: "", amount: 0 }]);

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const filePath = `${booking.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from("invoices")
      .upload(filePath, file, { upsert: true });

    if (error) {
      toast({ title: t("admin.error"), description: t("admin.job.upload.error"), variant: "destructive" });
    } else {
      const newUrl = filePath;
      setInvoiceUrl(newUrl);
      await supabase.from("bookings").update({ invoice_url: newUrl }).eq("id", booking.id);
      toast({ title: t("admin.job.upload.success"), description: t("admin.job.upload.success.msg") });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPhoto(true);

    const newPhotoPaths: string[] = [];
    for (const file of Array.from(files)) {
      const filePath = `${booking.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("job-photos")
        .upload(filePath, file, { upsert: true });
      if (!error) {
        newPhotoPaths.push(filePath);
      }
    }

    if (newPhotoPaths.length > 0) {
      const updatedPhotos = [...photos, ...newPhotoPaths];
      setPhotos(updatedPhotos);
      await supabase.from("bookings").update({ photos: updatedPhotos } as any).eq("id", booking.id);
      toast({ title: "Photos uploaded", description: `${newPhotoPaths.length} photo(s) added` });
    }
    setUploadingPhoto(false);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const removePhoto = async (index: number) => {
    const photoPath = photos[index];
    await supabase.storage.from("job-photos").remove([photoPath]);
    const updatedPhotos = photos.filter((_, i) => i !== index);
    setPhotos(updatedPhotos);
    await supabase.from("bookings").update({ photos: updatedPhotos } as any).eq("id", booking.id);
  };

  const getPhotoUrl = (path: string) => {
    const { data } = supabase.storage.from("job-photos").getPublicUrl(path);
    return data.publicUrl;
  };

  const viewInvoice = async () => {
    if (!invoiceUrl) return;
    const { data } = await supabase.storage.from("invoices").createSignedUrl(invoiceUrl, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const handleSendEmail = async (type: 'quote' | 'receipt') => {
    setSendingEmail(type);
    try {
      const { error } = await supabase.functions.invoke('send-job-email', {
        body: { bookingId: booking.id, type },
      });
      if (error) throw error;
      toast({
        title: type === 'quote' ? t("admin.job.quote.sent") : t("admin.job.receipt.sent"),
        description: `${t("admin.job.email.sentto")} ${booking.email}`,
      });
    } catch (err) {
      console.error("Send email error:", err);
      toast({ title: t("admin.error"), description: t("admin.job.email.error"), variant: "destructive" });
    }
    setSendingEmail(null);
  };

  const executeSave = async (opts: { sendReviewEmail?: boolean; sendApprovalEmail?: boolean; sendScheduledEmail?: boolean; sendRescheduleEmail?: boolean } = {}) => {
    setSaving(true);
    const cleanItems = lineItems.filter((item) => item.description.trim() !== "");
    const statusChanged = newStatus !== booking.status;
    const isNewlyApproved = statusChanged && newStatus === "approved";
    const isNewlyScheduled = statusChanged && newStatus === "scheduled";
    const isNewlyCompleted = statusChanged && newStatus === "completed";
    const isNewlyCancelled = statusChanged && newStatus === "cancelled";
    const isRescheduled = booking.status === "scheduled" && newStatus === "scheduled" &&
      (scheduledDate !== booking.scheduled_date || scheduledTime !== booking.scheduled_time);

    const updatePayload: Record<string, any> = {
      status: newStatus,
      admin_notes: adminNotes,
      line_items: cleanItems,
      total_price: total,
      invoice_url: invoiceUrl,
      assigned_cleaners: assignedCleanerIds,
    };

    if (newStatus === "scheduled") {
      updatePayload.scheduled_date = scheduledDate;
      updatePayload.scheduled_time = scheduledTime;
    }

    const { error } = await supabase
      .from("bookings")
      .update(updatePayload as any)
      .eq("id", booking.id);

    if (error) {
      toast({ title: t("admin.error"), description: t("admin.bookings.error.update"), variant: "destructive" });
    } else {
      initialRef.current = {
        adminNotes,
        status: newStatus,
        lineItems: JSON.stringify(cleanItems.length > 0 ? cleanItems : [{ description: "", amount: 0 }]),
      };

      toast({ title: t("admin.bookings.updated"), description: t("admin.bookings.updated.msg") });

      if (isNewlyApproved && opts.sendApprovalEmail) {
        supabase.functions.invoke('send-job-email', {
          body: { bookingId: booking.id, type: 'approval' },
        }).then(({ error: emailErr }) => {
          if (emailErr) console.error("Approval email error:", emailErr);
          else toast({ title: t("admin.job.approval.sent"), description: `${t("admin.job.email.sentto")} ${booking.email}` });
        });
      }

      if (isNewlyScheduled && opts.sendScheduledEmail) {
        supabase.functions.invoke('send-job-email', {
          body: { bookingId: booking.id, type: 'scheduled' },
        }).then(({ error: emailErr }) => {
          if (emailErr) console.error("Scheduled email error:", emailErr);
          else toast({ title: "📅 Calendar invites sent!", description: `Appointment emails sent to ${booking.email} and info@maidforchico.com` });
        });
      }

      // Sync to Google Calendar: create on new schedule, update on any save while scheduled
      if (isNewlyScheduled || isRescheduled || (newStatus === "scheduled" && !booking.google_calendar_event_id)) {
        const gcalAction = (isRescheduled || booking.google_calendar_event_id) ? "update" : "create";
        supabase.functions.invoke('sync-google-calendar', {
          body: { bookingId: booking.id, action: gcalAction },
        }).then(({ error: gcalErr }) => {
          if (gcalErr) console.error("Google Calendar sync error:", gcalErr);
          else toast({ title: gcalAction === "create" ? "📅 Google Calendar synced!" : "📅 Calendar updated!", description: gcalAction === "create" ? "Job added to your Google Calendar" : "Google Calendar event updated" });
        });
      }

      // Send reschedule email if opted in
      if (isRescheduled && opts.sendRescheduleEmail) {
        supabase.functions.invoke('send-job-email', {
          body: { bookingId: booking.id, type: 'scheduled' },
        }).then(({ error: emailErr }) => {
          if (emailErr) console.error("Reschedule email error:", emailErr);
          else toast({ title: "📅 Updated invite sent!", description: `Rescheduled email sent to ${booking.email}` });
        });
      }

      // Delete Google Calendar event when cancelled
      if (isNewlyCancelled) {
        supabase.functions.invoke('sync-google-calendar', {
          body: { bookingId: booking.id, action: 'delete' },
        }).then(({ error: gcalErr }) => {
          if (gcalErr) console.error("Google Calendar delete error:", gcalErr);
          else toast({ title: "🗑️ Calendar event removed", description: "Google Calendar event deleted" });
        });
      }

      if (isNewlyCompleted && opts.sendReviewEmail) {
        supabase.functions.invoke('send-review-request', {
          body: { bookingId: booking.id, email: booking.email, name: booking.name },
        }).then(({ error: emailErr }) => {
          if (emailErr) console.error("Review request error:", emailErr);
          else toast({ title: "⭐ Review request sent!", description: `Review request email sent to ${booking.email}` });
        });
      }

      onUpdated({
        ...booking,
        status: newStatus,
        admin_notes: adminNotes,
        line_items: cleanItems,
        total_price: total,
        invoice_url: invoiceUrl,
        scheduled_date: newStatus === "scheduled" ? scheduledDate : booking.scheduled_date,
        scheduled_time: newStatus === "scheduled" ? scheduledTime : booking.scheduled_time,
      });
    }
    setSaving(false);
  };

  const saveChanges = async () => {
    if (newStatus === "scheduled" && (!scheduledDate || !scheduledTime)) {
      toast({
        title: "Missing schedule details",
        description: "Please set a date and time before scheduling this job.",
        variant: "destructive",
      });
      return;
    }

    const statusChanged = newStatus !== booking.status;
    if (statusChanged && newStatus === "completed") {
      setShowReviewConfirm(true);
      return;
    }

    await executeSave(false);
  };

  // Non-admin can only move to completed or in-progress
  const availableStatuses = isAdmin
    ? ["pending", "contacted", "estimate-scheduled", "quoted", "approved", "scheduled", "in-progress", "completed", "cancelled"]
    : ["in-progress", "completed"];

  return (
    <>
      <Dialog open={!!booking} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {t("admin.job.details")}
              {booking.invoice_number && (
                <span className="text-xs font-mono bg-secondary text-muted-foreground px-2 py-1 rounded">
                  INV-{String(booking.invoice_number).padStart(4, "0")}
                </span>
              )}
              {booking.confirmed_at && (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                  ✅ Confirmed
                </span>
              )}
            </DialogTitle>
            <DialogDescription>{t("admin.job.details.desc")}</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="details">
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex-1 gap-1.5">
                📋 Details
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="messages" className="flex-1 gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Messages
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="details" className="space-y-5 mt-4">
            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.name")}</p>
                <p className="font-medium">{booking.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.phone")}</p>
                <p>{booking.phone}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.email")}</p>
                <p>{booking.email}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.address")}</p>
                <p>{booking.street}, {booking.city}, CA {booking.zip}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.service")}</p>
                <p className="capitalize">{(booking.service_type || "—").replace(/-/g, " ")}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.frequency")}</p>
                <p className="capitalize">{(booking.frequency || "—").replace(/-/g, " ")}</p>
              </div>
              {booking.sqft && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">SQ FT</p>
                  <p>{booking.sqft}</p>
                </div>
              )}
              {booking.bedrooms && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">BEDROOMS</p>
                  <p>{booking.bedrooms}</p>
                </div>
              )}
              {booking.bathrooms && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">BATHROOMS</p>
                  <p>{booking.bathrooms}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.prefdate")}</p>
                <p>{booking.preferred_date}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.preftime")}</p>
                <p className="capitalize">{booking.preferred_time || t("admin.bookings.nopref")}</p>
              </div>
            </div>

            {booking.notes && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.custnotes")}</p>
                <p className="text-sm bg-secondary/50 rounded p-3">{booking.notes}</p>
              </div>
            )}

            {/* Job Photos */}
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5" /> Job Photos
                </label>
                <div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="h-7 text-xs gap-1"
                  >
                    <Camera className="w-3 h-3" />
                    {uploadingPhoto ? "Uploading..." : "Add Photos"}
                  </Button>
                </div>
              </div>
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-border">
                      <img
                        src={getPhotoUrl(photo)}
                        alt={`Job photo ${i + 1}`}
                        className="w-full h-24 object-cover"
                      />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {photos.length === 0 && (
                <p className="text-xs text-muted-foreground">No photos yet</p>
              )}
            </div>

            {/* Line Items / Pricing — Admin only */}
            {isAdmin && (
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" /> {t("admin.job.lineitems")}
                    {booking.invoice_number && (
                      <span className="font-mono text-accent ml-2">
                        INV-{String(booking.invoice_number).padStart(4, "0")}
                      </span>
                    )}
                  </label>
                  <Button variant="ghost" size="sm" onClick={addLineItem} className="h-7 text-xs gap-1">
                    <Plus className="w-3 h-3" /> {t("admin.job.additem")}
                  </Button>
                </div>
                <div className="space-y-2">
                  {lineItems.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input
                        value={item.description}
                        onChange={(e) => updateLineItem(i, "description", e.target.value)}
                        placeholder={t("admin.job.item.desc")}
                        className="flex-1 text-sm"
                      />
                      <div className="relative w-24">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          type="number"
                          value={item.amount || ""}
                          onChange={(e) => updateLineItem(i, "amount", parseFloat(e.target.value) || 0)}
                          className="pl-6 text-sm"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(i)}
                        disabled={lineItems.length <= 1}
                        className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end items-center gap-2 pt-1 border-t border-border">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.job.total")}</span>
                  <span className="text-lg font-semibold text-accent">${total.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Invoice Upload — Admin only */}
            {isAdmin && (
              <div className="border-t border-border pt-4 space-y-3">
                <label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> {t("admin.job.invoice")}
                </label>
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {uploading ? t("admin.job.uploading") : t("admin.job.upload")}
                  </Button>
                  {invoiceUrl && (
                    <Button variant="outline" size="sm" onClick={viewInvoice} className="gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> {t("admin.job.viewinvoice")}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Status + Notes + Save */}
            <div className="border-t border-border pt-4 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">{t("admin.bookings.status")}</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableStatuses.map((s) => (
                      <SelectItem key={s} value={s}>{s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Scheduled date/time — shown when status is scheduled */}
              {newStatus === "scheduled" && (
                <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">📅 Schedule Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                      <Input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Time</label>
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  {(!scheduledDate || !scheduledTime) && (
                    <p className="text-xs text-destructive">⚠️ Date and time are required to schedule a job.</p>
                  )}
                </div>
              )}

              {/* Assigned Cleaners */}
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Assigned Cleaners
                </label>
                {cleaners.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No cleaners added yet. Add cleaners in the Cleaners tab.</p>
                ) : (
                  <div className="space-y-2">
                    <Select
                      onValueChange={(id) => {
                        if (!assignedCleanerIds.includes(id)) {
                          setAssignedCleanerIds((prev) => [...prev, id]);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Add a cleaner…" />
                      </SelectTrigger>
                      <SelectContent>
                        {cleaners
                          .filter((c) => c.active && !assignedCleanerIds.includes(c.id))
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        {cleaners.filter((c) => c.active && !assignedCleanerIds.includes(c.id)).length === 0 && (
                          <p className="text-xs text-muted-foreground px-3 py-2">All cleaners assigned</p>
                        )}
                      </SelectContent>
                    </Select>
                    {assignedCleanerIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {assignedCleanerIds.map((id) => {
                          const c = cleaners.find((cl) => cl.id === id);
                          if (!c) return null;
                          return (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1 bg-accent/15 text-accent border border-accent/30 rounded-full px-3 py-1 text-xs font-medium"
                            >
                              {c.name}
                              <button
                                type="button"
                                onClick={() => setAssignedCleanerIds((prev) => prev.filter((i) => i !== id))}
                                className="hover:text-destructive transition-colors ml-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
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

              {/* Action Buttons */}
              <div className="grid grid-cols-1 gap-2">
                <Button onClick={saveChanges} disabled={saving} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  {saving ? t("admin.bookings.saving") : t("admin.bookings.save")}
                </Button>
                {isAdmin && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={sendingEmail !== null}
                      onClick={() => handleSendEmail('quote')}
                      className="gap-1.5 text-xs"
                    >
                      📧 {sendingEmail === 'quote' ? t("admin.job.sending") : t("admin.job.sendquote")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={sendingEmail !== null}
                      onClick={() => handleSendEmail('receipt')}
                      className="gap-1.5 text-xs"
                    >
                      📧 {sendingEmail === 'receipt' ? t("admin.job.sending") : t("admin.job.sendreceipt")}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            </TabsContent>

            {/* Messages Tab */}
            {isAdmin && (
              <TabsContent value="messages" className="mt-4">
                <ThreadedChat
                  bookingId={booking.id}
                  customerId={booking.customer_id || undefined}
                  customerName={booking.name}
                  customerEmail={booking.email}
                  templates={getJobEmailTemplates()}
                  initialSubject={pendingTemplateSubject}
                  initialBody={pendingTemplateBody}
                  onInitialConsumed={() => { setPendingTemplateSubject(""); setPendingTemplateBody(""); }}
                />
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Unsaved changes warning */}
      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Do you want to save before closing?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowUnsavedWarning(false); onClose(); }}>
              Discard
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowUnsavedWarning(false);
                await saveChanges();
              }}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
      </AlertDialogContent>
      </AlertDialog>

      {/* Review request confirmation */}
      <AlertDialog open={showReviewConfirm} onOpenChange={setShowReviewConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Review Request?</AlertDialogTitle>
            <AlertDialogDescription>
              This job is being marked as completed. Would you like to send a Google review request email to <strong>{booking?.name}</strong> ({booking?.email})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              onClick={async () => {
                setShowReviewConfirm(false);
                await executeSave(false);
              }}
            >
              Complete Without Email
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowReviewConfirm(false);
                await executeSave(true);
              }}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              ⭐ Complete & Send Review Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default JobDetailDialog;
