import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DollarSign, CheckCircle, Clock, AlertCircle, Plus, Pencil } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Booking } from "./shared/types";

interface PaymentTrackingProps {
  booking: Booking;
  balanceDue: number;
  onUpdated: (updated: Booking) => void;
}

const PAYMENT_METHODS = [
  { value: "zelle", key: "admin.payment.zelle" },
  { value: "ach", key: "admin.payment.ach" },
  { value: "credit_card", key: "admin.payment.credit_card" },
  { value: "cash", key: "admin.payment.cash" },
  { value: "check", key: "admin.payment.check" },
  { value: "other", key: "admin.payment.other" },
];

const PAYMENT_STATUSES = [
  { value: "unpaid", key: "admin.payment.unpaid" },
  { value: "partially_paid", key: "admin.payment.partially_paid" },
  { value: "paid", key: "admin.payment.paid" },
];

const PaymentTracking = ({ booking, balanceDue, onUpdated }: PaymentTrackingProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [showManualForm, setShowManualForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [manualMethod, setManualMethod] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualRef, setManualRef] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editStatus, setEditStatus] = useState(booking.payment_status || "unpaid");
  const [editMethod, setEditMethod] = useState(booking.payment_method || "");
  const [editTotalPaid, setEditTotalPaid] = useState(String(booking.total_paid || 0));
  const [editProcessingFee, setEditProcessingFee] = useState(String(booking.processing_fee || 0));
  const [editPaidAt, setEditPaidAt] = useState(
    booking.paid_at ? new Date(booking.paid_at).toISOString().slice(0, 16) : ""
  );
  const [editReference, setEditReference] = useState(booking.payment_reference || "");

  const paymentStatus = booking.payment_status || "unpaid";
  const totalPaid = booking.total_paid || 0;
  const processingFee = booking.processing_fee || 0;
  const remainingBalance = Math.max(0, balanceDue + processingFee - totalPaid);

  const statusBadge = () => {
    switch (paymentStatus) {
      case "paid":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1"><CheckCircle className="w-3 h-3" /> {t("admin.payment.paid")}</Badge>;
      case "partially_paid":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1"><Clock className="w-3 h-3" /> {t("admin.payment.partially_paid")}</Badge>;
      default:
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1"><AlertCircle className="w-3 h-3" /> {t("admin.payment.unpaid")}</Badge>;
    }
  };

  const getMethodLabel = (method: string) => {
    const found = PAYMENT_METHODS.find(m => m.value === method);
    return found ? t(found.key) : method.replace(/_/g, " ");
  };

  const handleManualPayment = async () => {
    if (!manualMethod || !manualAmount || parseFloat(manualAmount) <= 0) {
      toast({ title: t("admin.error"), description: t("admin.payment.missing"), variant: "destructive" });
      return;
    }
    setSaving(true);

    const amount = parseFloat(manualAmount);
    const newTotalPaid = totalPaid + amount;
    const effectiveBalance = balanceDue + processingFee;
    const newRemaining = Math.max(0, effectiveBalance - newTotalPaid);
    const newStatus = newRemaining <= 0 ? "paid" : newTotalPaid > 0 ? "partially_paid" : "unpaid";

    const existingRef = booking.payment_reference || "";
    const newRefEntry = `${manualMethod.toUpperCase()} $${amount.toFixed(2)} on ${manualDate}${manualRef ? ` — ${manualRef}` : ""}`;
    const combinedRef = existingRef ? `${existingRef}\n${newRefEntry}` : newRefEntry;

    const updatePayload: Record<string, any> = {
      payment_status: newStatus,
      payment_method: booking.payment_method || manualMethod,
      total_paid: newTotalPaid,
      paid_at: new Date().toISOString(),
      payment_reference: combinedRef,
    };

    const { error } = await supabase
      .from("bookings")
      .update(updatePayload as any)
      .eq("id", booking.id);

    if (error) {
      toast({ title: t("admin.error"), description: t("admin.payment.error"), variant: "destructive" });
    } else {
      toast({ title: t("admin.payment.recorded"), description: `$${amount.toFixed(2)} via ${getMethodLabel(manualMethod)}` });
      onUpdated({
        ...booking,
        payment_status: newStatus,
        payment_method: booking.payment_method || manualMethod,
        total_paid: newTotalPaid,
        paid_at: new Date().toISOString(),
        payment_reference: combinedRef,
      });
      setShowManualForm(false);
      setManualMethod("");
      setManualAmount("");
      setManualRef("");
    }
    setSaving(false);
  };

  const openEditForm = () => {
    setEditStatus(booking.payment_status || "unpaid");
    setEditMethod(booking.payment_method || "");
    setEditTotalPaid(String(booking.total_paid || 0));
    setEditProcessingFee(String(booking.processing_fee || 0));
    setEditPaidAt(booking.paid_at ? new Date(booking.paid_at).toISOString().slice(0, 16) : "");
    setEditReference(booking.payment_reference || "");
    setShowEditForm(true);
    setShowManualForm(false);
  };

  const handleEditSave = async () => {
    setSaving(true);
    const newTotalPaid = parseFloat(editTotalPaid) || 0;
    const newFee = parseFloat(editProcessingFee) || 0;

    const updatePayload: Record<string, any> = {
      payment_status: editStatus,
      payment_method: editMethod || null,
      total_paid: newTotalPaid,
      processing_fee: newFee || null,
      paid_at: editPaidAt ? new Date(editPaidAt).toISOString() : null,
      payment_reference: editReference || null,
    };

    const { error } = await supabase
      .from("bookings")
      .update(updatePayload as any)
      .eq("id", booking.id);

    if (error) {
      toast({ title: t("admin.error"), description: t("admin.payment.update_error"), variant: "destructive" });
    } else {
      toast({ title: t("admin.payment.updated") });
      onUpdated({
        ...booking,
        payment_status: editStatus,
        payment_method: editMethod || null,
        total_paid: newTotalPaid,
        processing_fee: newFee || null,
        paid_at: editPaidAt ? new Date(editPaidAt).toISOString() : null,
        payment_reference: editReference || null,
      });
      setShowEditForm(false);
    }
    setSaving(false);
  };

  return (
    <div className="border-t border-border pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5" /> {t("admin.payment.tracking")}
        </label>
        <div className="flex items-center gap-2">
          {statusBadge()}
          {!showEditForm && (
            <Button variant="ghost" size="sm" onClick={openEditForm} className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
              <Pencil className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Edit form */}
      {showEditForm ? (
        <div className="bg-secondary/30 border border-border rounded-lg p-3 space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{t("admin.payment.edit")}</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("admin.payment.status")}</label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{t(s.key)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("admin.payment.method")}</label>
              <Select value={editMethod} onValueChange={setEditMethod}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder={t("admin.bookings.status")} />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{t(m.key)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("admin.payment.total_paid")}</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  value={editTotalPaid}
                  onChange={(e) => setEditTotalPaid(e.target.value)}
                  className="pl-6 text-sm"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("admin.payment.processing_fee")}</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  value={editProcessingFee}
                  onChange={(e) => setEditProcessingFee(e.target.value)}
                  className="pl-6 text-sm"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t("admin.payment.paid_at")}</label>
            <Input
              type="datetime-local"
              value={editPaidAt}
              onChange={(e) => setEditPaidAt(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t("admin.payment.reference")}</label>
            <Input
              value={editReference}
              onChange={(e) => setEditReference(e.target.value)}
              placeholder={t("admin.payment.ref_edit_placeholder")}
              className="text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleEditSave} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs">
              {saving ? t("admin.saving") : t("admin.payment.save_changes")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowEditForm(false)} className="text-xs">
              {t("admin.cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Payment summary grid */}
          <div className="bg-secondary/50 rounded-lg p-3 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <span className="text-muted-foreground text-xs">{t("admin.payment.original_balance")}</span>
              <span className="text-right font-medium">${balanceDue.toFixed(2)}</span>

              {processingFee > 0 && (
                <>
                  <span className="text-muted-foreground text-xs">{t("admin.payment.processing_fee")}</span>
                  <span className="text-right font-medium">${processingFee.toFixed(2)}</span>
                </>
              )}

              <span className="text-muted-foreground text-xs">{t("admin.payment.total_paid")}</span>
              <span className="text-right font-medium text-green-400">${totalPaid.toFixed(2)}</span>

              <div className="col-span-2 border-t border-border my-1" />

              <span className="text-muted-foreground text-xs font-semibold">{t("admin.payment.remaining_balance")}</span>
              <span className={`text-right font-bold ${remainingBalance <= 0 ? "text-green-400" : "text-accent"}`}>
                ${remainingBalance.toFixed(2)}
              </span>
            </div>

            {booking.payment_method && (
              <div className="grid grid-cols-2 gap-x-4 pt-1 border-t border-border">
                <span className="text-muted-foreground text-xs">{t("admin.payment.method")}</span>
                <span className="text-right text-xs capitalize">{getMethodLabel(booking.payment_method)}</span>
              </div>
            )}

            {booking.paid_at && (
              <div className="grid grid-cols-2 gap-x-4">
                <span className="text-muted-foreground text-xs">{t("admin.payment.paid_at")}</span>
                <span className="text-right text-xs">{new Date(booking.paid_at).toLocaleString()}</span>
              </div>
            )}

            {booking.payment_reference && (
              <div className="pt-1 border-t border-border">
                <span className="text-muted-foreground text-xs block mb-1">{t("admin.payment.reference")}</span>
                <p className="text-xs bg-background/50 rounded p-2 whitespace-pre-wrap font-mono">{booking.payment_reference}</p>
              </div>
            )}
          </div>

          {/* Manual payment button / form */}
          {paymentStatus !== "paid" && !showManualForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowManualForm(true)}
              className="w-full gap-1.5 text-xs"
            >
              <Plus className="w-3 h-3" /> {t("admin.payment.record")}
            </Button>
          )}

          {showManualForm && (
            <div className="bg-secondary/30 border border-border rounded-lg p-3 space-y-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{t("admin.payment.record_title")}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t("admin.payment.method")}</label>
                  <Select value={manualMethod} onValueChange={setManualMethod}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder={t("admin.bookings.status")} />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{t(m.key)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t("admin.payment.amount")}</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                      className="pl-6 text-sm"
                      min="0"
                      step="0.01"
                      placeholder={remainingBalance.toFixed(2)}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("admin.payment.date")}</label>
                <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("admin.payment.ref_note")}</label>
                <Input
                  value={manualRef}
                  onChange={(e) => setManualRef(e.target.value)}
                  placeholder={t("admin.payment.ref_placeholder")}
                  className="text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleManualPayment} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs">
                  {saving ? t("admin.saving") : t("admin.payment.save")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowManualForm(false)} className="text-xs">
                  {t("admin.cancel")}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PaymentTracking;
