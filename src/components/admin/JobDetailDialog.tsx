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
import { Plus, Trash2, Upload, FileText, DollarSign, Camera, X, Image, Sparkles, Send, MessageSquare, Loader2, CalendarCheck, CreditCard, Pencil, Copy } from "lucide-react";
import AddressAutocomplete from "@/components/ui/address-autocomplete";
import { Label } from "@/components/ui/label";
import JobTimer from "@/components/admin/JobTimer";
import { Checkbox } from "@/components/ui/checkbox";
import type { UserRole } from "@/pages/AdminDashboard";
import ThreadedChat from "@/components/admin/ThreadedChat";
import { formatLabel } from "./shared/utils";
import type { Booking, LineItem, Cleaner } from "./shared/types";
import PaymentTracking from "./PaymentTracking";

interface JobDetailDialogProps {
  booking: Booking | null;
  onClose: () => void;
  onUpdated: (updated: Booking) => void;
  userRole?: UserRole;
  onClone?: (booking: Booking) => void;
}

const JobDetailDialog = ({ booking, onClose, onUpdated, userRole = "admin", onClone }: JobDetailDialogProps) => {
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [editingDeposit, setEditingDeposit] = useState(false);
  const [customDeposit, setCustomDeposit] = useState<number | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [dialogTab, setDialogTab] = useState("details");
  const [savingDeposit, setSavingDeposit] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [showReviewConfirm, setShowReviewConfirm] = useState(false);
  const [showScheduleConfirm, setShowScheduleConfirm] = useState(false);
  const [showApprovalConfirm, setShowApprovalConfirm] = useState(false);
  const [showRescheduleConfirm, setShowRescheduleConfirm] = useState(false);
  const [confirmEmailPreview, setConfirmEmailPreview] = useState<"invoice" | "receipt" | null>(null);
  const [confirmPaymentMethod, setConfirmPaymentMethod] = useState<"card" | "ach" | null>(null);
  const [showDepositConfirm, setShowDepositConfirm] = useState(false);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [assignedCleanerIds, setAssignedCleanerIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { t, lang } = useLanguage();

  const isAdmin = userRole === "admin";

  // Editable customer info
  const [editingInfo, setEditingInfo] = useState(false);
  const [editInfo, setEditInfo] = useState({ name: "", email: "", phone: "", street: "", city: "", zip: "" });
  const [savingInfo, setSavingInfo] = useState(false);

  // Pending template for quick-email buttons
  const [pendingTemplateSubject, setPendingTemplateSubject] = useState("");
  const [pendingTemplateBody, setPendingTemplateBody] = useState("");
  const [pendingCtaUrl, setPendingCtaUrl] = useState("");
  const [pendingCtaLabel, setPendingCtaLabel] = useState("");

  // Track initial values to detect dirty state
  const initialRef = useRef({ adminNotes: "", status: "", lineItems: "" });

  useEffect(() => {
    if (booking) {
      const notes = booking.admin_notes || "";
      let items: LineItem[] = Array.isArray(booking.line_items) && booking.line_items.length > 0
        ? booking.line_items
        : [{ description: "", amount: 0 }];

      // Filter out any legacy deposit line items
      items = items.filter((item) => !item.description.toLowerCase().includes("deposit"));

      setAdminNotes(notes);
      setNewStatus(booking.status);
      setLineItems(items);
      setScheduledDate(booking.scheduled_date || booking.preferred_date || "");
      setScheduledTime(booking.scheduled_time || booking.preferred_time || "09:00");
      setInvoiceUrl(booking.invoice_url);
      setPhotos(Array.isArray(booking.photos) ? booking.photos : []);
      setAssignedCleanerIds(Array.isArray(booking.assigned_cleaners) ? booking.assigned_cleaners : []);
      setEditingInfo(false);
      setEditingDeposit(false);
      setDialogTab("details");
      setCustomDeposit((booking as any).deposit_override !== undefined && (booking as any).deposit_override !== null ? Number((booking as any).deposit_override) : null);
      setEditInfo({ name: booking.name, email: booking.email, phone: booking.phone, street: booking.street, city: booking.city, zip: booking.zip });
      initialRef.current = {
        adminNotes: notes,
        status: booking.status,
        lineItems: JSON.stringify(items),
      };
      // Reset messaging state
      setPendingTemplateSubject("");
      setPendingTemplateBody("");
      setPendingCtaUrl("");
      setPendingCtaLabel("");
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
        subject: `Your Cleaning is Booked! — ${scheduledDate || booking.scheduled_date || booking.preferred_date}`,
        body: `Exciting news — your cleaning has been scheduled! 🎉\n\n📅 Date: ${scheduledDate || booking.scheduled_date || booking.preferred_date}\n🕐 Time: ${scheduledTime || booking.scheduled_time || booking.preferred_time || "TBD"}\n📍 Address: ${booking.street}, ${booking.city}, CA ${booking.zip}\n🏠 Service: ${serviceLabel}\n\n✅ Your 25% deposit has been received — your spot is confirmed! The remaining balance is due on the day of your cleaning.\n\nHere are a few things to keep in mind:\n• Please make sure we have access to your home at the scheduled time\n• Secure any pets if applicable\n• Let us know if there are any special instructions\n\nIf you need to reschedule, please let us know at least 24 hours in advance.\n\nWe look forward to making your home sparkle!\nBetty & the Maid for Chico Team`,
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
      {
        id: "payment-reminder",
        name: "💸 Payment Reminder",
        color: "text-orange-500",
        subject: "Friendly Payment Reminder — Maid for Chico",
        body: `We hope you enjoyed your recent cleaning! This is a friendly reminder that your payment is still outstanding.\n\n🏠 Service: ${serviceLabel}\n📍 Address: ${booking.street}, ${booking.city}, CA ${booking.zip}\n📅 Date: ${booking.scheduled_date || booking.preferred_date}\n\nPlease send your payment at your earliest convenience. Here are your payment options:\n\n✅ Zelle (preferred — no fees): (530) 966-0752\n🏦 ACH Bank Transfer: Reply and we'll send a secure link\n💳 Credit Card: Available upon request (3% fee applies)\n\nIf you've already sent payment, please disregard this message. If you have any questions, feel free to reply or call us at (530) 966-0752.\n\nThank you!\nBetty & the Maid for Chico Team`,
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

  const hasUnsavedPricingChanges = () => {
    const lineItemsDirty = JSON.stringify(lineItems) !== initialRef.current.lineItems;
    const persistedDeposit = booking.deposit_override !== null && booking.deposit_override !== undefined
      ? Number(booking.deposit_override)
      : null;
    const currentDeposit = customDeposit !== null && customDeposit !== undefined
      ? Number(customDeposit)
      : null;

    return lineItemsDirty || editingDeposit || currentDeposit !== persistedDeposit;
  };

  const openPaymentConfirm = (paymentMethod: "card" | "ach") => {
    if (hasUnsavedPricingChanges()) {
      toast({
        title: "Save required",
        description: "Please save job changes first so payment emails match your itemized breakdown.",
        variant: "destructive",
      });
      return;
    }

    setConfirmPaymentMethod(paymentMethod);
  };

  const saveCustomerInfo = async () => {
    if (!booking) return;
    setSavingInfo(true);
    const { error } = await supabase
      .from("bookings")
      .update({
        name: editInfo.name,
        email: editInfo.email,
        phone: editInfo.phone,
        street: editInfo.street,
        city: editInfo.city,
        zip: editInfo.zip,
      })
      .eq("id", booking.id);

    if (error) {
      toast({ title: t("admin.error"), description: t("admin.bookings.error.update"), variant: "destructive" });
    } else {
      toast({ title: t("admin.bookings.updated"), description: t("admin.job.info.updated") });
      setEditingInfo(false);
      onUpdated({ ...booking, ...editInfo, status: newStatus, admin_notes: adminNotes, line_items: lineItems, total_price: subtotal });
    }
    setSavingInfo(false);
  };

  if (!booking) return null;

  const serviceItems = lineItems.filter((item) => !item.description.toLowerCase().includes("deposit"));
  const nonEmptyServiceItems = serviceItems.filter((item) => item.description.trim() !== "");
  const subtotal = serviceItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const defaultDeposit = subtotal > 0 ? subtotal * 0.25 : 0;
  const depositAmount = customDeposit !== null ? customDeposit : defaultDeposit;
  const total = subtotal - depositAmount;
  const previewBalance = Math.max(0, subtotal - depositAmount);
  const previewFee = confirmPaymentMethod === "card"
    ? Math.round(previewBalance * 0.03 * 100) / 100
    : 0;
  const previewTotal = previewBalance + previewFee;

  const generateItemizedPdf = () => {
    const invoiceNum = booking.invoice_number ? `INV-${String(booking.invoice_number).padStart(4, "0")}` : "";
    const dateStr = new Date().toLocaleDateString("en-US");
    const items = nonEmptyServiceItems.length > 0 ? nonEmptyServiceItems : serviceItems;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice ${invoiceNum}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap');body{font-family:Inter,Arial,Helvetica,sans-serif;margin:0;padding:40px;color:#1a1a1a}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;border-bottom:3px solid #e8472a;padding-bottom:20px}.company{font-family:'Playfair Display',Georgia,serif;font-size:24px;font-weight:700}.company .maid{color:#e8472a}.company .forchico{color:#1a1a1a}.invoice-title{font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:700;color:#1a1a1a;text-align:right}.meta{text-align:right;font-size:13px;color:#666;margin-top:4px}.section{margin:20px 0}.label{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#e8472a;margin-bottom:4px;font-weight:600}.value{font-size:14px;color:#333}table{width:100%;border-collapse:collapse;margin:20px 0}th{background:#fef2f0;text-align:left;padding:10px 12px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#e8472a;border-bottom:2px solid #e8472a}td{padding:10px 12px;border-bottom:1px solid #f0e0dc;font-size:14px}td.amount,th.amount{text-align:right;font-family:monospace}.totals{margin-left:auto;width:280px}.totals tr td{border:none;padding:6px 12px}.totals .total-row td{border-top:2px solid #1a1a1a;font-size:18px;font-weight:bold}.footer{margin-top:40px;text-align:center;font-size:12px;color:#e8472a;border-top:2px solid #e8472a;padding-top:15px;font-family:'Playfair Display',Georgia,serif;font-style:italic}@media print{body{padding:20px}}</style></head><body>
<div class="header"><div><div class="company"><span class="maid">Maid</span> <span class="forchico">For Chico</span></div><div style="font-size:13px;color:#666;margin-top:4px">Professional Cleaning Services</div></div><div><div class="invoice-title">INVOICE</div><div class="meta">${invoiceNum ? invoiceNum + "<br>" : ""}Date: ${dateStr}</div></div></div>
<div class="section" style="display:flex;gap:40px"><div><div class="label">Bill To</div><div class="value"><strong>${booking.name}</strong></div><div class="value">${booking.street}</div><div class="value">${booking.city}, CA ${booking.zip}</div><div class="value">${booking.email}</div><div class="value">${booking.phone}</div></div><div><div class="label">Service</div><div class="value" style="text-transform:capitalize">${(booking.service_type || "").replace(/-/g, " ")}</div><div class="label" style="margin-top:8px">Frequency</div><div class="value" style="text-transform:capitalize">${(booking.frequency || "").replace(/-/g, " ")}</div></div></div>
<table><thead><tr><th>Description</th><th class="amount">Amount</th></tr></thead><tbody>${items.map(item => `<tr><td>${item.description || "Service"}</td><td class="amount">$${(item.amount || 0).toFixed(2)}</td></tr>`).join("")}</tbody></table>
<table class="totals"><tr><td>Subtotal</td><td class="amount">$${subtotal.toFixed(2)}</td></tr>${depositAmount > 0 ? `<tr><td>Deposit</td><td class="amount">-$${depositAmount.toFixed(2)}</td></tr>` : ""}${booking.payment_status === "paid" ? `<tr><td>Total Paid</td><td class="amount" style="color:#16a34a">$${(booking.total_paid || 0).toFixed(2)}</td></tr>${booking.payment_method ? `<tr><td>Payment Method</td><td class="amount" style="text-transform:capitalize">${(booking.payment_method || "").replace(/_/g, " ")}</td></tr>` : ""}${booking.paid_at ? `<tr><td>Paid On</td><td class="amount">${new Date(booking.paid_at).toLocaleDateString("en-US")}</td></tr>` : ""}<tr class="total-row"><td>Balance</td><td class="amount" style="color:#16a34a">$0.00</td></tr>` : `<tr class="total-row"><td>Balance Due</td><td class="amount">$${Math.max(0, total).toFixed(2)}</td></tr>`}</table>
<div class="footer">Thank you for choosing Maid For Chico!</div></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const pw = window.open(url, "_blank");
    if (pw) { pw.onload = () => { pw.print(); }; }
  };

  const saveDepositChange = async () => {
    const depositToSave = Math.max(0, customDeposit ?? defaultDeposit);
    const recalculatedTotal = Math.max(0, subtotal - depositToSave);

    setSavingDeposit(true);
    const { data: updatedBooking, error } = await supabase
      .from("bookings")
      .update({
        deposit_override: depositToSave,
        total_price: recalculatedTotal,
      } as any)
      .eq("id", booking.id)
      .select("*")
      .single();

    if (error) {
      toast({
        title: t("admin.error"),
        description: error.message || t("admin.bookings.error.update"),
        variant: "destructive",
      });
    } else {
      setCustomDeposit(Number(updatedBooking.deposit_override ?? 0));
      setEditingDeposit(false);
      onUpdated(updatedBooking as Booking);
      toast({ title: t("admin.bookings.updated"), description: "Deposit saved." });
    }

    setSavingDeposit(false);
  };

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
      toast({ title: t("admin.job.photos.uploaded"), description: `${newPhotoPaths.length} photo(s)` });
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

  const preparePaymentEmailDraft = async (paymentMethod: "card" | "ach") => {
    const sendingType = paymentMethod === "ach" ? "ach-payment" : "cc-payment";
    setSendingEmail(sendingType);

    try {
      const { data, error } = await supabase.functions.invoke("create-stripe-payment", {
        body: { bookingId: booking.id, paymentMethod },
      });

      const stripeData = typeof data === "string"
        ? (() => { try { return JSON.parse(data); } catch { return null; } })()
        : data;

      if (error) {
        const message = (error as any)?.message || "Failed to create payment link";
        throw new Error(message);
      }

      if (!stripeData?.checkoutUrl) {
        throw new Error(stripeData?.error || "Payment link was not returned");
      }

      const firstName = (booking.name ?? "").trim().split(/\s+/)[0] || "there";
      const itemizedLines = nonEmptyServiceItems.length > 0
        ? nonEmptyServiceItems.map((item) => `• ${item.description}: $${Number(item.amount || 0).toFixed(2)}`).join("\n")
        : "• Cleaning Service: $0.00";

      const bal = Number(stripeData.balanceDue || 0).toFixed(2);
      const fee = Number(stripeData.fee || 0).toFixed(2);
      const totalPay = Number(stripeData.totalWithFee || 0).toFixed(2);
      const methodLabel = paymentMethod === "ach" ? "ACH Payment" : "Credit Card Payment";

      setPendingTemplateSubject(`${methodLabel} Link — Maid for Chico`);
      setPendingTemplateBody(
        `As requested, here is your secure ${paymentMethod === "ach" ? "ACH" : "credit card"} payment link:\n\nItemized Services:\n${itemizedLines}\n\nSubtotal: $${subtotal.toFixed(2)}\nDeposit Collected: -$${depositAmount.toFixed(2)}\nBalance Due: $${bal}\nProcessing Fee ${paymentMethod === "card" ? "(3%)" : "(0%)"}: $${fee}\nTotal to Pay: $${totalPay}\n\nThis link will expire in 24 hours. If you have any questions, feel free to reply to this email or call us at (530) 966-0752.\n\nThank you!\nBetty & the Maid for Chico Team`
      );
      setPendingCtaUrl(stripeData.checkoutUrl);
      setPendingCtaLabel(paymentMethod === "ach" ? "🏦 Pay by ACH" : "💳 Pay Here");
      setDialogTab("messages");
      toast({ title: `💳 ${methodLabel} ready!`, description: "Review the email in the Messages tab before sending." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create payment link";
      console.error("Payment draft error:", err);
      toast({ title: t("admin.error"), description: message, variant: "destructive" });
    }

    setSendingEmail(null);
  };

  const prepareDepositEmailDraft = async () => {
    setSendingEmail("deposit-payment");

    try {
      const { data, error } = await supabase.functions.invoke("create-deposit-payment", {
        body: { bookingId: booking.id },
      });

      const stripeData = typeof data === "string"
        ? (() => { try { return JSON.parse(data); } catch { return null; } })()
        : data;

      if (error) {
        const message = (error as any)?.message || "Failed to create deposit payment link";
        throw new Error(message);
      }

      if (!stripeData?.checkoutUrl) {
        throw new Error(stripeData?.error || "Payment link was not returned");
      }

      const firstName = (booking.name ?? "").trim().split(/\s+/)[0] || "there";
      const depAmt = Number(stripeData.depositAmount || 0).toFixed(2);
      const fee = Number(stripeData.fee || 0).toFixed(2);
      const totalPay = Number(stripeData.totalWithFee || 0).toFixed(2);

      setPendingTemplateSubject("Deposit Payment Link — Maid for Chico");
      setPendingTemplateBody(
        `Hi ${firstName},\n\nThank you for approving your cleaning quote! To secure your appointment, please submit your 25% deposit using the link below.\n\nDeposit Amount: $${depAmt}\nCC Processing Fee (3%): $${fee}\nTotal to Pay: $${totalPay}\n\nThis link will expire in 24 hours. If you have any questions, feel free to reply to this email or call us at (530) 966-0752.\n\nThank you!\nBetty & the Maid for Chico Team`
      );
      setPendingCtaUrl(stripeData.checkoutUrl);
      setPendingCtaLabel("💳 Pay Deposit");
      setDialogTab("messages");
      toast({ title: "💳 Deposit link ready!", description: "Review the email in the Messages tab before sending." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create deposit link";
      console.error("Deposit payment draft error:", err);
      toast({ title: t("admin.error"), description: message, variant: "destructive" });
    }

    setSendingEmail(null);
  };

  const handleSendEmail = async (type: "quote" | "receipt" | "invoice") => {
    // For invoice and receipt, show preview dialog first
    if (type === "invoice" || type === "receipt") {
      setConfirmEmailPreview(type);
      return;
    }
    // Quote sends directly (legacy behavior)
    setSendingEmail(type);
    try {
      const { error } = await supabase.functions.invoke("send-job-email", {
        body: { bookingId: booking.id, type },
      });
      if (error) throw error;
      toast({
        title: t("admin.job.quote.sent"),
        description: `${t("admin.job.email.sentto")} ${booking.email}`,
      });
    } catch (err) {
      console.error("Send email error:", err);
      toast({ title: t("admin.error"), description: t("admin.job.email.error"), variant: "destructive" });
    }
    setSendingEmail(null);
  };

  const prepareEmailDraft = (type: "invoice" | "receipt") => {
    const firstName = (booking.name ?? "").trim().split(/\s+/)[0] || "there";
    const serviceLabel = formatLabel(booking.service_type);
    const itemizedLines = nonEmptyServiceItems.length > 0
      ? nonEmptyServiceItems.map((item) => `• ${item.description}: $${Number(item.amount || 0).toFixed(2)}`).join("\n")
      : "• Cleaning Service: $0.00";

    const schedDate = booking.scheduled_date || booking.preferred_date;

    if (type === "invoice") {
      let pricingBlock = `Services:\n${itemizedLines}\n\nSubtotal: $${subtotal.toFixed(2)}`;
      if (depositAmount > 0) {
        pricingBlock += `\nDeposit applied: ($${depositAmount.toFixed(2)})`;
      }
      pricingBlock += `\nBalance due: $${previewBalance.toFixed(2)}`;

      setPendingTemplateSubject("Cleaning Invoice — Maid for Chico");
      setPendingTemplateBody(
        `Thank you for choosing Maid for Chico! Here is your invoice:\n\n🏠 Service: ${serviceLabel}\n📍 Address: ${booking.street}, ${booking.city}, CA ${booking.zip}\n📅 Date: ${schedDate}\n\n${pricingBlock}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━\n💳 Payment Options\n━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Zelle (preferred — no fees)\nSend to: (530) 966-0752\n\n🏦 ACH Bank Transfer\nAvailable — we can send a secure ACH payment link.\n\n💳 Credit Card\nAvailable upon request — a processing fee applies.\n\nThank you for your business!\nBetty & the Maid for Chico Team`
      );
    } else {
      let pricingBlock = `Services:\n${itemizedLines}\n\nSubtotal: $${subtotal.toFixed(2)}`;
      if (depositAmount > 0) {
        pricingBlock += `\nDeposit received: ($${depositAmount.toFixed(2)})`;
      }
      pricingBlock += `\nRemaining balance: $${previewBalance.toFixed(2)}`;

      setPendingTemplateSubject(`Cleaning Receipt — ${schedDate}`);
      setPendingTemplateBody(
        `Thank you for choosing Maid for Chico! Here's your receipt:\n\n📅 Date: ${schedDate}\n🏠 Service: ${serviceLabel}\n📍 Address: ${booking.street}, ${booking.city}, CA ${booking.zip}\n\n${pricingBlock}\n\nThank you for your business!\nBetty & the Maid for Chico Team`
      );
    }

    setConfirmEmailPreview(null);
    setDialogTab("messages");
    toast({
      title: type === "invoice" ? "📧 Invoice draft ready!" : "📧 Receipt draft ready!",
      description: "Review the email in the Messages tab before sending.",
    });
  };

  const executeSave = async (opts: { sendReviewEmail?: boolean; sendApprovalEmail?: boolean; sendScheduledEmail?: boolean; sendRescheduleEmail?: boolean } = {}) => {
    setSaving(true);
    const cleanItems = lineItems.filter((item) => item.description.trim() !== "");
    const statusChanged = newStatus !== booking.status;
    const isNewlyApproved = statusChanged && newStatus === "approved";
    // Treat as newly scheduled if status changed OR if explicitly sending scheduled email
    const isNewlyScheduled = (statusChanged && newStatus === "scheduled") || (opts.sendScheduledEmail && newStatus === "scheduled");
    const isNewlyCompleted = statusChanged && newStatus === "completed";
    const isNewlyCancelled = statusChanged && newStatus === "cancelled";
    const isRescheduled = booking.status === "scheduled" && newStatus === "scheduled" &&
      (scheduledDate !== booking.scheduled_date || scheduledTime !== booking.scheduled_time) && !opts.sendScheduledEmail;

    const persistedDeposit = customDeposit ?? (booking.deposit_override ?? null);

    const updatePayload: Record<string, any> = {
      status: newStatus,
      admin_notes: adminNotes,
      line_items: cleanItems,
      total_price: subtotal,
      invoice_url: invoiceUrl,
      assigned_cleaners: assignedCleanerIds,
      deposit_override: persistedDeposit,
    };

    if (newStatus === "scheduled") {
      updatePayload.scheduled_date = scheduledDate;
      updatePayload.scheduled_time = scheduledTime;
    }

    const { data: updatedBooking, error } = await supabase
      .from("bookings")
      .update(updatePayload as any)
      .eq("id", booking.id)
      .select("*")
      .single();

    if (error) {
      toast({
        title: t("admin.error"),
        description: error.message || t("admin.bookings.error.update"),
        variant: "destructive",
      });
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

      onUpdated(updatedBooking as Booking);
    }
    setSaving(false);
  };

  const saveChanges = async () => {
    if (newStatus === "scheduled" && (!scheduledDate || !scheduledTime)) {
      toast({
        title: t("admin.job.schedule.missing"),
        description: t("admin.job.schedule.missing.desc"),
        variant: "destructive",
      });
      return;
    }

    const statusChanged = newStatus !== booking.status;
    const isRescheduled = booking.status === "scheduled" && newStatus === "scheduled" &&
      (scheduledDate !== booking.scheduled_date || scheduledTime !== booking.scheduled_time);

    if (statusChanged && newStatus === "completed") {
      setShowReviewConfirm(true);
      return;
    }
    if (statusChanged && newStatus === "approved") {
      setShowApprovalConfirm(true);
      return;
    }
    if (statusChanged && newStatus === "scheduled") {
      setShowScheduleConfirm(true);
      return;
    }
    if (isRescheduled) {
      setShowRescheduleConfirm(true);
      return;
    }

    await executeSave();
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
                  ✅ {t("admin.job.confirmed")}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>{t("admin.job.details.desc")}</DialogDescription>
          </DialogHeader>
          <Tabs value={dialogTab} onValueChange={setDialogTab}>
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex-1 gap-1.5">
                {t("admin.job.details.tab")}
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="messages" className="flex-1 gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> {t("admin.job.messages.tab")}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="details" className="space-y-5 mt-4">
            {/* Customer Info — Editable */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{t("admin.job.customerinfo")}</span>
                <div className="flex gap-1.5">
                  {isAdmin && onClone && !editingInfo && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { onClone(booking); handleClose(); }}>
                      <Copy className="w-3 h-3" /> {t("admin.job.clone")}
                    </Button>
                  )}
                  {isAdmin && !editingInfo && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setEditingInfo(true)}>
                      <Pencil className="w-3 h-3" /> {t("admin.cd.edit")}
                    </Button>
                  )}
                </div>
              </div>

              {editingInfo ? (
                <div className="space-y-3 border border-border rounded-lg p-3 bg-secondary/30">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">{t("admin.bookings.name")}</Label>
                      <Input value={editInfo.name} onChange={(e) => setEditInfo({ ...editInfo, name: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t("admin.bookings.phone")}</Label>
                      <Input value={editInfo.phone} onChange={(e) => setEditInfo({ ...editInfo, phone: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("admin.bookings.email")}</Label>
                    <Input value={editInfo.email} onChange={(e) => setEditInfo({ ...editInfo, email: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("admin.bookings.address")}</Label>
                    <AddressAutocomplete
                      value={editInfo.street}
                      onChange={(val) => setEditInfo({ ...editInfo, street: val })}
                      onSelect={(addr) => setEditInfo({ ...editInfo, street: addr.street, city: addr.city || editInfo.city, zip: addr.zip || editInfo.zip })}
                      placeholder={t("admin.cd.street")}
                      className="mb-2"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={editInfo.city} onChange={(e) => setEditInfo({ ...editInfo, city: e.target.value })} placeholder={t("admin.cd.city")} />
                      <Input value={editInfo.zip} onChange={(e) => setEditInfo({ ...editInfo, zip: e.target.value })} placeholder={t("admin.cd.zip")} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveCustomerInfo} disabled={savingInfo} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5 text-xs">
                      {savingInfo ? t("admin.cd.saving") : t("admin.cd.save")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setEditingInfo(false); setEditInfo({ name: booking.name, email: booking.email, phone: booking.phone, street: booking.street, city: booking.city, zip: booking.zip }); }}>
                      {t("admin.cd.cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
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
                      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.sqft")}</p>
                      <p>{booking.sqft}</p>
                    </div>
                  )}
                  {booking.bedrooms && (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.bedrooms")}</p>
                      <p>{booking.bedrooms}</p>
                    </div>
                  )}
                  {booking.bathrooms && (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t("admin.bookings.bathrooms")}</p>
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
              )}
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
                  <Image className="w-3.5 h-3.5" /> {t("admin.job.photos")}
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
                    {uploadingPhoto ? t("admin.job.photos.uploading") : t("admin.job.photos.add")}
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
                <p className="text-xs text-muted-foreground">{t("admin.job.photos.none")}</p>
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
                  <div className="flex items-center gap-1">
                    {JSON.stringify(lineItems) !== initialRef.current.lineItems && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={saveChanges}
                        disabled={saving}
                        className="h-7 text-xs gap-1 text-green-400 border-green-500/30 hover:bg-green-500/10"
                      >
                        {saving ? t("admin.bookings.saving") : t("admin.bookings.save")}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={addLineItem} className="h-7 text-xs gap-1">
                      <Plus className="w-3 h-3" /> {t("admin.job.additem")}
                    </Button>
                  </div>
                </div>
                {/* Quick-add preset buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: t("admin.job.preset.house_cleaning"), desc: "House Cleaning" },
                    { label: t("admin.job.preset.deep_clean"), desc: "Deep Clean" },
                    { label: t("admin.job.preset.kitchen"), desc: "Kitchen" },
                    { label: t("admin.job.preset.bathroom"), desc: "Bathroom" },
                    { label: t("admin.job.preset.oven"), desc: "Oven Cleaning" },
                    { label: t("admin.job.preset.fridge"), desc: "Fridge Cleaning" },
                    { label: t("admin.job.preset.windows"), desc: "Windows" },
                    { label: t("admin.job.preset.laundry"), desc: "Laundry" },
                    { label: t("admin.job.preset.baseboards"), desc: "Baseboards" },
                    { label: t("admin.job.preset.organizing"), desc: "Organizing" },
                  ].map((preset) => (
                    <Button
                      key={preset.desc}
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2 rounded-full border-border hover:border-accent hover:text-accent"
                      onClick={() => {
                        const emptyIdx = lineItems.findIndex((item) => item.description.trim() === "" && !item.amount);
                        if (emptyIdx >= 0) {
                          updateLineItem(emptyIdx, "description", preset.desc);
                        } else {
                          setLineItems((prev) => [...prev, { description: preset.desc, amount: 0 }]);
                        }
                      }}
                    >
                      + {preset.label}
                    </Button>
                  ))}
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
                <div className="pt-1 border-t border-border space-y-1">
                  <div className="flex justify-end items-center gap-2">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.job.subtotal")}</span>
                    <span className="text-sm font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-end items-center gap-2">
                    <span className="text-xs tracking-wider text-muted-foreground">{t("admin.job.deposit")}</span>
                    {editingDeposit ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">-$</span>
                        <Input
                          type="number"
                          value={customDeposit ?? depositAmount}
                          onChange={(e) => setCustomDeposit(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-24 h-8 text-sm text-right"
                          min={0}
                          step={0.01}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-xs"
                          onClick={saveDepositChange}
                          disabled={savingDeposit}
                        >
                          {savingDeposit ? t("admin.bookings.saving") : t("admin.bookings.save")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-xs"
                          onClick={() => {
                            const persistedDeposit = (booking as any).deposit_override;
                            setCustomDeposit(persistedDeposit !== undefined && persistedDeposit !== null ? Number(persistedDeposit) : null);
                            setEditingDeposit(false);
                          }}
                          disabled={savingDeposit}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setCustomDeposit(customDeposit !== null ? customDeposit : depositAmount);
                          setEditingDeposit(true);
                        }}
                        className="text-sm text-accent hover:underline cursor-pointer"
                        title="Click to edit deposit"
                      >
                        -${depositAmount.toFixed(2)}
                      </button>
                    )}
                  </div>
                  <div className="flex justify-end items-center gap-2 pt-1 border-t border-border">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.job.balancedue")}</span>
                    <span className="text-lg font-semibold text-accent">${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button variant="outline" size="sm" onClick={generateItemizedPdf} className="gap-1.5 text-xs">
                      <FileText className="w-3.5 h-3.5" /> Download PDF
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Tracking — Admin only */}
            {isAdmin && (
              <PaymentTracking booking={booking} balanceDue={total} onUpdated={onUpdated} />
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
                <label className="flex items-center gap-2 text-sm uppercase tracking-wider font-bold text-accent mb-2">
                  <AlertTriangle className="w-4 h-4 text-accent" />
                  {t("admin.bookings.status")}
                  <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded font-semibold normal-case tracking-normal">
                    {t("admin.status.important")}
                  </span>
                </label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableStatuses.map((s) => {
                      const label = t(`admin.inquiry.${s}`) !== `admin.inquiry.${s}`
                        ? t(`admin.inquiry.${s}`)
                        : t(`admin.job.${s}`) !== `admin.job.${s}`
                          ? t(`admin.job.${s}`)
                          : s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                      return <SelectItem key={s} value={s}>{label}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Scheduled date/time — shown when status is scheduled */}
              {newStatus === "scheduled" && (
                <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{t("admin.job.schedule.details")}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t("admin.job.schedule.date")}</label>
                      <Input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{t("admin.job.schedule.time")}</label>
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  {(!scheduledDate || !scheduledTime) && (
                    <p className="text-xs text-destructive">{t("admin.job.schedule.required")}</p>
                  )}
                  {/* Send Scheduled Cleaning button — right under schedule details */}
                  {scheduledDate && scheduledTime && (
                    <Button
                      onClick={() => {
                        setNewStatus("scheduled");
                        setShowScheduleConfirm(true);
                      }}
                      disabled={saving || sendingEmail !== null}
                      className="w-full gap-2 bg-green-600 text-white hover:bg-green-700"
                    >
                      <Send className="w-4 h-4" />
                      {saving ? t("admin.bookings.saving") : t("admin.job.sendscheduled")}
                    </Button>
                  )}
                </div>
              )}

              {/* Assigned Cleaners */}
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> {t("admin.job.assigncleaners")}
                </label>
                {cleaners.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("admin.job.nocleaners")}</p>
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
                        <SelectValue placeholder={t("admin.job.addcleaner")} />
                      </SelectTrigger>
                      <SelectContent>
                        {cleaners
                          .filter((c) => c.active && !assignedCleanerIds.includes(c.id))
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        {cleaners.filter((c) => c.active && !assignedCleanerIds.includes(c.id)).length === 0 && (
                          <p className="text-xs text-muted-foreground px-3 py-2">{t("admin.job.allassigned")}</p>
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

              {/* Action Buttons — Save + Email actions above Job Timer */}
              <div className="grid grid-cols-1 gap-2">
                <Button onClick={saveChanges} disabled={saving} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  {saving ? t("admin.bookings.saving") : t("admin.bookings.save")}
                </Button>
                {isAdmin && (
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={sendingEmail !== null}
                      onClick={() => handleSendEmail('invoice')}
                      className="gap-1.5 text-xs"
                    >
                      <FileText className="w-3 h-3" />
                      {sendingEmail === 'invoice' ? t("admin.job.sending") : t("admin.job.sendinvoice")}
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
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={sendingEmail !== null || booking.payment_status === 'paid'}
                      onClick={() => openPaymentConfirm("ach")}
                      className="gap-1.5 text-xs"
                    >
                      🏦 {sendingEmail === "ach-payment" ? t("admin.job.sending") : t("admin.job.achpayment")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={sendingEmail !== null || booking.payment_status === 'paid'}
                      onClick={() => openPaymentConfirm("card")}
                      className="gap-1.5 text-xs"
                    >
                      <CreditCard className="w-3 h-3" />
                      {sendingEmail === "cc-payment" ? t("admin.job.sending") : t("admin.job.ccpayment")}
                    </Button>
                    <Button
                      size="sm"
                      disabled={sendingEmail !== null || booking.payment_status === 'paid'}
                      onClick={() => setShowDepositConfirm(true)}
                      className="gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CreditCard className="w-3 h-3" />
                      {sendingEmail === "deposit-payment" ? t("admin.job.sending") : t("admin.deposit.sendcclink")}
                    </Button>
                  </div>
                )}
              </div>

              {/* Time Tracking — below save actions */}
              {(isAdmin || userRole === "moderator") && (
                <JobTimer bookingId={booking.id} userRole={userRole} cleaners={cleaners} assignedCleaners={booking.assigned_cleaners || []} />
              )}
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
                  initialCtaUrl={pendingCtaUrl}
                  initialCtaLabel={pendingCtaLabel}
                  onInitialConsumed={() => { setPendingTemplateSubject(""); setPendingTemplateBody(""); setPendingCtaUrl(""); setPendingCtaLabel(""); }}
                />
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Payment email confirmation */}
      <AlertDialog open={!!confirmPaymentMethod} onOpenChange={(open) => { if (!open) setConfirmPaymentMethod(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm payment email breakdown</AlertDialogTitle>
            <AlertDialogDescription>
              This exact itemized summary will be inserted into the payment email draft before you send.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 rounded-md border border-border bg-secondary/20 p-3 text-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Itemized services</p>
            {nonEmptyServiceItems.length > 0 ? (
              <div className="space-y-1">
                {nonEmptyServiceItems.map((item, index) => (
                  <div key={`${item.description}-${index}`} className="flex items-start justify-between gap-3">
                    <span className="text-foreground/90">{item.description}</span>
                    <span className="font-medium">${Number(item.amount || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No line items added yet.</p>
            )}

            <div className="space-y-1 border-t border-border pt-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("admin.job.deposit")}</span>
                <span>-${depositAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Balance due</span>
                <span>${previewBalance.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Processing fee {confirmPaymentMethod === "card" ? "(3%)" : "(0%)"}</span>
                <span>${previewFee.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2 font-semibold">
                <span>Total to pay</span>
                <span>${previewTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmPaymentMethod) return;
                const selectedMethod = confirmPaymentMethod;
                setConfirmPaymentMethod(null);
                await preparePaymentEmailDraft(selectedMethod);
              }}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {sendingEmail !== null ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing...
                </span>
              ) : (
                "Continue to Messages"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deposit CC Link confirmation */}
      <AlertDialog open={showDepositConfirm} onOpenChange={setShowDepositConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>💳 {t("admin.deposit.sendcclink")}</AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "es" ? "Esto creará un enlace de pago de Stripe para el depósito del 25% y preparará un borrador de correo." : "This will create a Stripe payment link for the 25% deposit and prepare an email draft."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 rounded-md border border-border bg-secondary/20 p-3 text-sm">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("admin.job.subtotal")}</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("admin.deposit.25pct")}</span>
                <span>${depositAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("admin.deposit.ccfee")}</span>
                <span>${(Math.round(depositAmount * 0.03 * 100) / 100).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2 font-semibold">
                <span>{t("admin.deposit.customerpays")}</span>
                <span>${(depositAmount + Math.round(depositAmount * 0.03 * 100) / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>{lang === "es" ? "Volver" : "Back"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowDepositConfirm(false);
                await prepareDepositEmailDraft();
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {sendingEmail === "deposit-payment" ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing...
                </span>
              ) : (
                "Create Deposit Link"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmEmailPreview} onOpenChange={(open) => !open && setConfirmEmailPreview(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmEmailPreview === "invoice" ? "📧 Invoice Preview" : "📧 Receipt Preview"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Review the itemized breakdown below. This will be inserted into an editable email draft in the Messages tab.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 rounded-md border border-border bg-secondary/20 p-3 text-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Itemized services</p>
            {nonEmptyServiceItems.length > 0 ? (
              <div className="space-y-1">
                {nonEmptyServiceItems.map((item, index) => (
                  <div key={`preview-${item.description}-${index}`} className="flex items-start justify-between gap-3">
                    <span className="text-foreground/90">{item.description}</span>
                    <span className="font-medium">${Number(item.amount || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No line items added yet.</p>
            )}

            <div className="space-y-1 border-t border-border pt-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {depositAmount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {confirmEmailPreview === "invoice" ? "Deposit applied" : "Deposit received"}
                  </span>
                  <span>-${depositAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-border pt-2 font-semibold">
                <span>{confirmEmailPreview === "invoice" ? "Balance due" : "Remaining balance"}</span>
                <span>${previewBalance.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmEmailPreview) prepareEmailDraft(confirmEmailPreview);
              }}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Continue to Messages
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.job.unsaved.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.job.unsaved.desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowUnsavedWarning(false); onClose(); }}>
              {t("admin.job.unsaved.discard")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowUnsavedWarning(false);
                await saveChanges();
              }}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {t("admin.job.unsaved.save")}
            </AlertDialogAction>
          </AlertDialogFooter>
      </AlertDialogContent>
      </AlertDialog>

      {/* Review request confirmation */}
      <AlertDialog open={showReviewConfirm} onOpenChange={setShowReviewConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.job.review.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.job.review.desc")} <strong>{booking?.name}</strong> ({booking?.email})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              onClick={async () => {
                setShowReviewConfirm(false);
                await executeSave();
              }}
            >
              {t("admin.job.review.skip")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowReviewConfirm(false);
                await executeSave({ sendReviewEmail: true });
              }}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {t("admin.job.review.send")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approval email confirmation */}
      <AlertDialog open={showApprovalConfirm} onOpenChange={setShowApprovalConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.job.approval.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.job.approval.desc")} <strong>{booking?.name}</strong> ({booking?.email})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              onClick={async () => {
                setShowApprovalConfirm(false);
                await executeSave();
              }}
            >
              {t("admin.job.saveonly")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowApprovalConfirm(false);
                await executeSave({ sendApprovalEmail: true });
              }}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {t("admin.job.saveandsend")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Schedule email confirmation */}
      <AlertDialog open={showScheduleConfirm} onOpenChange={setShowScheduleConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.job.invite.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.job.invite.desc")} <strong>{booking?.name}</strong> ({booking?.email})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              onClick={async () => {
                setShowScheduleConfirm(false);
                await executeSave();
              }}
            >
              {t("admin.job.saveonly")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowScheduleConfirm(false);
                await executeSave({ sendScheduledEmail: true });
              }}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {t("admin.job.invite.send")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule email confirmation */}
      <AlertDialog open={showRescheduleConfirm} onOpenChange={setShowRescheduleConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.job.reschedule.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.job.reschedule.desc")} <strong>{booking?.name}</strong> ({booking?.email})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              onClick={async () => {
                setShowRescheduleConfirm(false);
                await executeSave();
              }}
            >
              {t("admin.job.saveonly")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowRescheduleConfirm(false);
                await executeSave({ sendRescheduleEmail: true });
              }}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {t("admin.job.invite.send")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default JobDetailDialog;
