import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, CalendarCheck, Loader2, AlertCircle, Calendar, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const ConfirmAppointment = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "found" | "confirmed" | "already" | "cancelled" | "cancel-confirm" | "error">("loading");
  const [booking, setBooking] = useState<any>(null);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState<{ fee: number; depositForfeited: boolean } | null>(null);
  const [hoursUntilAppointment, setHoursUntilAppointment] = useState<number>(Infinity);

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
    
    // Check if within 24 hours
    const scheduledDate = b.scheduled_date || b.preferred_date;
    const scheduledTime = b.scheduled_time || b.preferred_time || "09:00";
    const [year, month, day] = (scheduledDate || "2025-01-01").split("-").map(Number);
    const timeParts = (scheduledTime || "09:00").split(":");
    const hour = parseInt(timeParts[0]) || 9;
    const minute = parseInt(timeParts[1]) || 0;
    const scheduled = new Date(year, month - 1, day, hour, minute);
    const hoursUntil = (scheduled.getTime() - Date.now()) / (1000 * 60 * 60);
    setHoursUntilAppointment(hoursUntil);

    if (b.status === 'cancelled') {
      setBooking(b);
      setStatus("cancelled");
    } else if (b.confirmed_at) {
      setBooking(b);
      setStatus("already");
    } else {
      setBooking(b);
      setStatus("found");
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    const { data, error } = await supabase.rpc("confirm_booking_by_token", { _token: token });
    if (error || !data) {
      setStatus("error");
    } else {
      setStatus("confirmed");
    }
    setConfirming(false);
  };

  const handleCancelRequest = () => {
    setStatus("cancel-confirm");
  };

  const handleCancelConfirm = async () => {
    setCancelling(true);
    const { data, error } = await supabase.rpc("cancel_booking_by_token", { _token: token });
    if (error || !data || !(data as any).success) {
      setStatus("error");
    } else {
      const fee = (data as any).fee || 0;
      setCancelResult({ fee, depositForfeited: hoursUntilAppointment < 48 });
      setStatus("cancelled");

      // Notify business about the cancellation
      if (booking?.id) {
        supabase.functions.invoke("send-job-email", {
          body: { bookingId: booking.id, type: "cancellation" },
        }).catch(console.error);
      }
    }
    setCancelling(false);
  };

  const scheduledDate = booking?.scheduled_date || booking?.preferred_date;
  const scheduledTime = booking?.scheduled_time || booking?.preferred_time || "Morning";

  const googleCalUrl = booking ? (() => {
    const date = scheduledDate;
    const time = scheduledTime;
    const [year, month, day] = (date || "2025-01-01").split("-").map(Number);
    const timeParts = (time || "09:00").split(":");
    const hour = parseInt(timeParts[0]) || 9;
    const minute = parseInt(timeParts[1]) || 0;
    const startDate = new Date(year, month - 1, day, hour, minute);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, "0");
    const formatGcal = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    const address = `${booking.street}, ${booking.city}, CA ${booking.zip}`;
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: "Cleaning Service - Maid For Chico",
      dates: `${formatGcal(startDate)}/${formatGcal(endDate)}`,
      details: `${(booking.service_type || "cleaning").replace("-", " ")} cleaning\nContact: (530) 966-0752`,
      location: address,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  })() : "";

  const icsUrl = booking
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ics?bookingId=${booking.id}`
    : "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl border border-border p-8 text-center space-y-6">
        {/* Logo */}
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Maid For Chico</h1>
          <p className="text-xs uppercase tracking-[3px] text-accent mt-1">Appointment Confirmation</p>
        </div>

        {status === "loading" && (
          <div className="py-12">
            <Loader2 className="w-10 h-10 animate-spin text-accent mx-auto" />
            <p className="text-muted-foreground mt-4">Loading your appointment...</p>
          </div>
        )}

        {status === "error" && (
          <div className="py-8 space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Invalid Link</h2>
            <p className="text-muted-foreground text-sm">
              This confirmation link is invalid or expired. Please contact us at{" "}
              <a href="tel:5309660752" className="text-accent hover:underline">(530) 966-0752</a>{" "}
              if you need help.
            </p>
          </div>
        )}

        {status === "found" && booking && (
          <div className="space-y-6">
            <CalendarCheck className="w-14 h-14 text-accent mx-auto" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">Confirm Your Appointment</h2>
              <p className="text-muted-foreground text-sm mt-2">Hi {booking.name}, please confirm the details below:</p>
            </div>

            <div className="bg-secondary/50 rounded-xl p-5 text-left space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">📅 Date</span>
                <span className="font-medium text-foreground">{scheduledDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">🕐 Time</span>
                <span className="font-medium text-foreground capitalize">{scheduledTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">📍 Address</span>
                <span className="font-medium text-foreground text-right">{booking.street}, {booking.city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">🧹 Service</span>
                <span className="font-medium text-foreground capitalize">{(booking.service_type || "").replace("-", " ")}</span>
              </div>
            </div>

            <Button
              onClick={handleConfirm}
              disabled={confirming}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-semibold rounded-xl"
            >
              {confirming ? (
                <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Confirming...</>
              ) : (
                "✅ Yes, I Confirm"
              )}
            </Button>

            <button
              onClick={handleCancelRequest}
              className="text-muted-foreground hover:text-destructive text-sm underline transition-colors"
            >
              I need to cancel
            </button>

            <p className="text-muted-foreground text-xs">
              Don't worry — your appointment is already on the books even if you don't confirm here.
            </p>
          </div>
        )}

        {status === "cancel-confirm" && booking && (
          <div className="space-y-6">
            <AlertTriangle className="w-14 h-14 text-yellow-500 mx-auto" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">Cancel Appointment?</h2>
              <p className="text-muted-foreground text-sm mt-2">
                Are you sure you want to cancel your cleaning on <strong className="text-foreground">{scheduledDate}</strong>?
              </p>
            </div>

            <div className="bg-secondary/50 rounded-xl p-4 text-left space-y-2">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                📋 Cancellation Policy
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li className={hoursUntilAppointment >= 48 ? "text-green-500 font-semibold" : ""}>
                  <strong>More than 48 hours</strong> — cancel free of charge
                </li>
                <li className={hoursUntilAppointment >= 24 && hoursUntilAppointment < 48 ? "text-yellow-500 font-semibold" : ""}>
                  <strong>24–48 hours</strong> — your 25% deposit is non-refundable
                </li>
                <li className={hoursUntilAppointment < 24 ? "text-destructive font-semibold" : ""}>
                  <strong>Less than 24 hours / no-show</strong> — deposit forfeited + $50 rebooking fee
                </li>
              </ul>
            </div>

            {hoursUntilAppointment < 24 && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-left">
                <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Late Cancellation: Deposit forfeited + $50 rebooking fee
                </p>
              </div>
            )}

            {hoursUntilAppointment >= 24 && hoursUntilAppointment < 48 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-left">
                <p className="text-sm font-semibold text-yellow-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Your 25% deposit will be non-refundable
                </p>
              </div>
            )}

            {hoursUntilAppointment >= 48 && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-left">
                <p className="text-sm text-green-600">
                  ✅ No fees — you're cancelling more than 48 hours in advance.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStatus("found")}
                className="flex-1 py-5"
              >
                Go Back
              </Button>
              <Button
                onClick={handleCancelConfirm}
                disabled={cancelling}
                className="flex-1 py-5 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {cancelling ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Cancelling...</>
                ) : (
                  "Yes, Cancel"
                )}
              </Button>
            </div>
          </div>
        )}

        {status === "cancelled" && booking && (
          <div className="space-y-6">
            <XCircle className="w-14 h-14 text-destructive mx-auto" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">Appointment Cancelled</h2>
              <p className="text-muted-foreground text-sm mt-2">
                Your cleaning on {scheduledDate} has been cancelled.
              </p>
            </div>

            {cancelResult && cancelResult.fee > 0 && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
                <p className="text-sm text-destructive font-semibold">
                  A ${cancelResult.fee} late cancellation fee applies.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  We will contact you regarding payment. Questions? Call us at (530) 966-0752.
                </p>
              </div>
            )}

            <div className="border-t border-border pt-4">
              <p className="text-muted-foreground text-sm">
                Want to rebook?{" "}
                <a href="https://maidforchico.com" className="text-accent hover:underline font-medium">Visit our website</a>
                {" "}or call{" "}
                <a href="tel:5309660752" className="text-accent hover:underline font-medium">(530) 966-0752</a>
              </p>
            </div>
          </div>
        )}

        {(status === "confirmed" || status === "already") && booking && (
          <div className="space-y-6">
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {status === "confirmed" ? "Confirmed!" : "Already Confirmed"}
              </h2>
              <p className="text-muted-foreground text-sm mt-2">
                {status === "confirmed"
                  ? `Thanks ${booking.name}! Your appointment on ${scheduledDate} is confirmed.`
                  : `This appointment was already confirmed. See you on ${scheduledDate}!`}
              </p>
            </div>

            <div className="bg-secondary/50 rounded-xl p-5 text-left space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">📅 Date</span>
                <span className="font-medium text-foreground">{scheduledDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">🕐 Time</span>
                <span className="font-medium text-foreground capitalize">{scheduledTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">📍 Address</span>
                <span className="font-medium text-foreground text-right">{booking.street}, {booking.city}</span>
              </div>
            </div>

            {/* Calendar buttons */}
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">Add to your calendar:</p>
              <div className="flex gap-3">
                <a
                  href={googleCalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-medium text-sm transition-colors"
                >
                  <Calendar className="w-4 h-4" /> Google Calendar
                </a>
                <a
                  href={icsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl py-3 font-medium text-sm transition-colors border border-border"
                >
                  📥 Download .ics
                </a>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-muted-foreground text-xs">
                Need to reschedule? Call us at{" "}
                <a href="tel:5309660752" className="text-accent hover:underline font-medium">(530) 966-0752</a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfirmAppointment;
