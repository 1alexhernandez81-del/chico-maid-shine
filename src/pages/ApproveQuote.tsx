import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2, AlertCircle, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

const ApproveQuote = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "found" | "approved" | "already" | "expired" | "error">("loading");
  const [booking, setBooking] = useState<any>(null);
  const [approving, setApproving] = useState(false);

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

  const formatPrice = (price: number | null) => {
    if (!price) return null;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);
  };

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

            {/* Disclaimer */}
            <p className="text-xs text-amber-300/80 text-left leading-relaxed">
              ⚠️ This is an estimate and is subject to change depending on additional services requested or removed at the time of cleaning. A 25% deposit is required to secure your cleaning date.
            </p>

            <Button
              onClick={handleApprove}
              disabled={approving}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg font-semibold rounded-xl"
            >
              {approving ? (
                <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Approving...</>
              ) : (
                "✅ Approve Estimate & Book Cleaning"
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
                  ? `Thanks ${booking.name}! Your estimate has been approved. We'll be in touch shortly to collect the deposit and schedule your cleaning!`
                  : `This estimate was already approved. We'll be in touch to finalize your cleaning date!`}
              </p>
            </div>

            {booking.total_price && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <p className="text-xs uppercase tracking-wider text-emerald-400 mb-1">Approved Quote</p>
                <p className="text-2xl font-bold text-emerald-400">{formatPrice(booking.total_price)}</p>
              </div>
            )}

            <div className="bg-secondary/50 rounded-xl p-4 text-left space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">🏠 Service</span>
                <span className="font-medium text-foreground capitalize">{(booking.service_type || "").replace("-", " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">📍 Address</span>
                <span className="font-medium text-foreground text-right">{booking.street}, {booking.city}</span>
              </div>
            </div>

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
