import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DollarSign, CheckCircle, Clock, AlertCircle, Plus } from "lucide-react";
import type { Booking } from "./shared/types";

interface PaymentTrackingProps {
  booking: Booking;
  balanceDue: number;
  onUpdated: (updated: Booking) => void;
}

const PAYMENT_METHODS = [
  { value: "zelle", label: "Zelle" },
  { value: "ach", label: "ACH" },
  { value: "credit_card", label: "Credit Card" },
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "other", label: "Other" },
];

const PaymentTracking = ({ booking, balanceDue, onUpdated }: PaymentTrackingProps) => {
  const { toast } = useToast();
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualMethod, setManualMethod] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualRef, setManualRef] = useState("");
  const [saving, setSaving] = useState(false);

  const paymentStatus = booking.payment_status || "unpaid";
  const totalPaid = booking.total_paid || 0;
  const processingFee = booking.processing_fee || 0;
  const remainingBalance = Math.max(0, balanceDue + processingFee - totalPaid);

  const statusBadge = () => {
    switch (paymentStatus) {
      case "paid":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1"><CheckCircle className="w-3 h-3" /> Paid</Badge>;
      case "partially_paid":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1"><Clock className="w-3 h-3" /> Partially Paid</Badge>;
      default:
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1"><AlertCircle className="w-3 h-3" /> Unpaid</Badge>;
    }
  };

  const handleManualPayment = async () => {
    if (!manualMethod || !manualAmount || parseFloat(manualAmount) <= 0) {
      toast({ title: "Missing fields", description: "Please fill in payment method and amount.", variant: "destructive" });
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
      toast({ title: "Error", description: "Failed to save payment.", variant: "destructive" });
    } else {
      toast({ title: "💰 Payment recorded", description: `$${amount.toFixed(2)} via ${manualMethod}` });
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

  return (
    <div className="border-t border-border pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5" /> Payment Tracking
        </label>
        {statusBadge()}
      </div>

      {/* Payment summary grid */}
      <div className="bg-secondary/50 rounded-lg p-3 space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <span className="text-muted-foreground text-xs">Original Balance</span>
          <span className="text-right font-medium">${balanceDue.toFixed(2)}</span>

          {processingFee > 0 && (
            <>
              <span className="text-muted-foreground text-xs">Processing Fee</span>
              <span className="text-right font-medium">${processingFee.toFixed(2)}</span>
            </>
          )}

          <span className="text-muted-foreground text-xs">Total Paid</span>
          <span className="text-right font-medium text-green-400">${totalPaid.toFixed(2)}</span>

          <div className="col-span-2 border-t border-border my-1" />

          <span className="text-muted-foreground text-xs font-semibold">Remaining Balance</span>
          <span className={`text-right font-bold ${remainingBalance <= 0 ? "text-green-400" : "text-accent"}`}>
            ${remainingBalance.toFixed(2)}
          </span>
        </div>

        {booking.payment_method && (
          <div className="grid grid-cols-2 gap-x-4 pt-1 border-t border-border">
            <span className="text-muted-foreground text-xs">Payment Method</span>
            <span className="text-right text-xs capitalize">{(booking.payment_method || "").replace(/_/g, " ")}</span>
          </div>
        )}

        {booking.paid_at && (
          <div className="grid grid-cols-2 gap-x-4">
            <span className="text-muted-foreground text-xs">Paid At</span>
            <span className="text-right text-xs">{new Date(booking.paid_at).toLocaleString()}</span>
          </div>
        )}

        {booking.payment_reference && (
          <div className="pt-1 border-t border-border">
            <span className="text-muted-foreground text-xs block mb-1">Reference</span>
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
          <Plus className="w-3 h-3" /> Record Manual Payment
        </Button>
      )}

      {showManualForm && (
        <div className="bg-secondary/30 border border-border rounded-lg p-3 space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Record Payment</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Method</label>
              <Select value={manualMethod} onValueChange={setManualMethod}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Amount</label>
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
            <label className="text-xs text-muted-foreground mb-1 block">Date</label>
            <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} className="text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Reference / Note (optional)</label>
            <Input
              value={manualRef}
              onChange={(e) => setManualRef(e.target.value)}
              placeholder="Zelle confirmation, check #, etc."
              className="text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleManualPayment} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs">
              {saving ? "Saving..." : "Save Payment"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowManualForm(false)} className="text-xs">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentTracking;
