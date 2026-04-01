import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2, AlertCircle, DollarSign, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

const ApproveQuote = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "found" | "approved" | "already" | "expired" | "error">("loading");
  const [booking, setBooking] = useState<any>(null);
  const [approving, setApproving] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    loadBooking();
  }, [token]);

  const loadBooking = async () => {
    const { data, error } = await supabase.rpc("get_booking_by_token", { _token: token });
    if (error || !data || data.length === 0) {
      setStatus("error");
      return;
    }
    const b = data[0];
    if (b.status === "approved" || b.confirmed_at) {
      setBooking(b);
      setStatus("already");
    } else {
      setBooking(b);
      setStatus("found");
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    const { data, error } = await supabase.rpc("approve_quote_by_token", { _token: token });
    if (error || !data || !(data as any).success) {
      const reason = (data as any)?.reason;
      if (reason === "not_found_or_expired") {
        setStatus("expired");
      } else {
        setStatus("error");
      }
    } else {
      setStatus("approved");
      // Notify admin that quote was approved
      try {
        await supabase.functions.invoke("send-job-email", {
          body: { bookingId: booking?.id, type: "quote-approved-admin" },
        });
      } catch (e) {
        console.error("Failed to notify admin:", e);
      }
    }
    setApproving(false);
  };

  const handlePayDeposit = async () => {
    setCreatingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-deposit-payment", {
        body: { token },
      });

      const stripeData = typeof data === "string"
        ? (() => { try { return JSON.parse(data); } catch { return null; } })()
        : data;

      if (error || !stripeData?.checkoutUrl) {
        throw new Error(stripeData?.error || "Failed to create payment link");
      }

      window.location.href = stripeData.checkoutUrl;
    } catch (err) {
      console.error("Payment link error:", err);
      setCreatingPayment(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return null;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);
  };

  const depositAmount = booking?.total_price ? booking.total_price * 0.25 : 0;
  const ccFee = Math.round(depositAmount * 0.03 * 100) / 100;
  const depositWithFee = depositAmount + ccFee;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl border border-border p-8 text-center space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Maid For Chico</h1>
          <p className="text-xs uppercase tracking-[3px] text-accent mt-1">Quote Approval</p>
        </div>

        {status === "loading" && (
          <div className="py-12">
            <Loader2 className="w-10 h-10 animate-spin text-accent mx-auto" />
            <p className="text-muted-foreground mt-4">Loading your quote...</p>
          </div>
        )}

        {status === "error" && (
          <div className="py-8 space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Invalid Link</h2>
            <p className="text-muted-foreground text-sm">
              This approval link is invalid, expired, or the quote has already been processed. Please contact us at{" "}
              <a href="tel:5309660752" className="text-accent hover:underline">(530) 966-0752</a> if you need help.
            </p>
          </div>
        )}

        {status === "expired" && (
          <div className="py-8 space-y-4">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Quote Expired</h2>
            <p className="text-muted-foreground text-sm">
              This quote approval link has expired (quotes are valid for 30 days). Please contact us at{" "}
              <a href="tel:5309660752" className="text-accent hover:underline">(530) 966-0752</a> or reply to your original email to request a new quote.
            </p>
          </div>
        )}

        {status === "found" && booking && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Approve Your Estimate</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Hi {booking.name}, review the details below and approve to move forward.
              </p>
            </div>

            {/* Quote Price */}
            {booking.total_price ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5">
                <p className="text-xs uppercase tracking-wider text-emerald-400 mb-1">Estimated Quote</p>
                <p className="text-3xl font-bold text-emerald-400">{formatPrice(booking.total_price)}</p>
                <p className="text-xs text-muted-foreground mt-1">per visit</p>
              </div>
            ) : (
              <div className="bg-secondary/50 rounded-xl p-5">
                <DollarSign className="w-10 h-10 text-emerald-500 mx-auto" />
              </div>
            )}

            {/* Service Details */}
            <div className="bg-secondary/50 rounded-xl p-4 text-left space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">🏠 Service</span>
                <span className="font-medium text-foreground capitalize">{(booking.service_type || "").replace("-", " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">📍 Address</span>
                <span className="font-medium text-foreground text-right">{booking.street}, {booking.city}</span>
              </div>
              {(booking.sqft || booking.bedrooms || booking.bathrooms) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">📐 Size</span>
                  <span className="font-medium text-foreground text-right">
                    {[booking.sqft && `${booking.sqft} sqft`, booking.bedrooms && `${booking.bedrooms} bed`, booking.bathrooms && `${booking.bathrooms} bath`].filter(Boolean).join(" · ")}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">📋 Frequency</span>
                <span className="font-medium text-foreground capitalize">{(booking.frequency || "").replace("-", " ")}</span>
              </div>
            </div>

            {/* Deposit info */}
            {booking.total_price && (
              <div className="bg-secondary/50 rounded-xl p-4 text-left space-y-2 text-sm border border-border">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">25% Deposit Required</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deposit</span>
                  <span className="font-medium">{formatPrice(depositAmount)}</span>
                </div>
                <p className="text-xs text-muted-foreground">The remaining balance is due on the day of your cleaning.</p>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-amber-300/80 text-left leading-relaxed">
              ⚠️ This is an estimate and is subject to change depending on additional services requested or removed at the time of cleaning.
            </p>

            {/* Approve button */}
            <Button
              onClick={handleApprove}
              disabled={approving}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg font-semibold rounded-xl"
            >
              {approving ? (
                <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Approving...</>
              ) : (
                "✅ Approve Estimate"
              )}
            </Button>

            <p className="text-muted-foreground text-xs">
              Have questions? Call us at{" "}
              <a href="tel:5309660752" className="text-accent hover:underline">(530) 966-0752</a>
            </p>
          </div>
        )}

        {(status === "approved" || status === "already") && booking && (
          <div className="space-y-5">
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {status === "approved" ? "Estimate Approved! 🎉" : "Already Approved"}
              </h2>
              <p className="text-muted-foreground text-sm mt-2">
                {status === "approved"
                  ? `Thanks ${booking.name}! Your estimate has been approved. Secure your spot by paying the deposit below.`
                  : `This estimate was already approved. You can still pay your deposit below if you haven't already.`}
              </p>
            </div>

            {booking.total_price && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <p className="text-xs uppercase tracking-wider text-emerald-400 mb-1">Approved Quote</p>
                <p className="text-2xl font-bold text-emerald-400">{formatPrice(booking.total_price)}</p>
              </div>
            )}

            {/* Payment Options */}
            {booking.total_price && depositAmount > 0 && (
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Pay Your 25% Deposit</p>
                
                {/* Deposit breakdown */}
                <div className="bg-secondary/50 rounded-xl p-4 text-left space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deposit (25%)</span>
                    <span className="font-medium">{formatPrice(depositAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">CC processing fee (3%)</span>
                    <span>{formatPrice(ccFee)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 font-semibold">
                    <span>Total</span>
                    <span>{formatPrice(depositWithFee)}</span>
                  </div>
                </div>

                {/* Pay with CC */}
                <Button
                  onClick={handlePayDeposit}
                  disabled={creatingPayment}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 text-base font-semibold rounded-xl gap-2"
                >
                  {creatingPayment ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Creating payment link...</>
                  ) : (
                    <><CreditCard className="w-5 h-5" /> 💳 Pay Deposit — {formatPrice(depositWithFee)}</>
                  )}
                </Button>

                {/* Zelle option */}
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 text-left">
                  <p className="text-sm font-medium text-purple-400 mb-1">✅ Pay by Zelle (no fees!)</p>
                  <p className="text-xs text-muted-foreground">
                    Send <span className="font-semibold text-foreground">{formatPrice(depositAmount)}</span> via Zelle to <span className="font-semibold text-foreground">(530) 966-0752</span>
                  </p>
                </div>
              </div>
            )}

            <div className="border-t border-border pt-4">
              <p className="text-muted-foreground text-sm">
                Questions? Call us at{" "}
                <a href="tel:5309660752" className="text-accent hover:underline font-medium">(530) 966-0752</a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApproveQuote;
