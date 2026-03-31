import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CalendarCheck, Loader2, AlertCircle, CheckCircle2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatTime12(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

const PickTime = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const date = searchParams.get("date");
  const time = searchParams.get("time");

  const [status, setStatus] = useState<"loading" | "ready" | "confirming" | "confirmed" | "already" | "error">("loading");
  const [booking, setBooking] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token || !date || !time) {
      setErrorMsg("Invalid link — missing required information.");
      setStatus("error");
      return;
    }
    // Load booking to show details
    loadBooking();
  }, [token, date, time]);

  const loadBooking = async () => {
    const { data, error } = await supabase.rpc("get_booking_by_token", { _token: token });
    if (error || !data || data.length === 0) {
      setErrorMsg("This link is invalid or expired.");
      setStatus("error");
      return;
    }
    const b = data[0];
    if (b.status === "scheduled" || b.status === "completed" || b.status === "cancelled") {
      setBooking(b);
      setStatus("already");
      return;
    }
    // Check if estimate is already scheduled at this exact time
    if (b.status === "estimate-scheduled" && b.scheduled_date === date) {
      setBooking(b);
      setStatus("already");
      return;
    }
    setBooking(b);
    setStatus("ready");
  };

  const handleConfirm = async () => {
    if (!token || !date || !time) return;
    setStatus("confirming");

    const { data, error } = await supabase.rpc("select_estimate_time", {
      _token: token,
      _date: date,
      _time: time,
    });

    if (error) {
      console.error("Pick time error:", error);
      setErrorMsg("Something went wrong. Please try again or call us.");
      setStatus("error");
      return;
    }

    const result = data as any;
    if (!result?.success) {
      if (result?.reason === "already_scheduled") {
        setStatus("already");
      } else {
        setErrorMsg("This link is invalid or expired.");
        setStatus("error");
      }
      return;
    }

    // Trigger calendar sync + admin notification
    try {
      await supabase.functions.invoke("sync-google-calendar", {
        body: { bookingId: result.booking_id },
      });
    } catch (err) {
      console.error("Calendar sync error (non-blocking):", err);
    }

    // Send admin notification email
    try {
      await supabase.functions.invoke("send-job-email", {
        body: { bookingId: result.booking_id, type: "scheduled" },
      });
    } catch (err) {
      console.error("Email notification error (non-blocking):", err);
    }

    setStatus("confirmed");
  };

  const googleCalUrl = date && time ? (() => {
    const [year, month, day] = date.split("-").map(Number);
    const [h, m] = time.split(":").map(Number);
    const startDate = new Date(year, month - 1, day, h, m);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 min estimate
    const pad = (n: number) => n.toString().padStart(2, "0");
    const formatGcal = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    const address = booking ? `${booking.street}, ${booking.city}, CA ${booking.zip}` : "";
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: "In-Home Estimate - Maid For Chico",
      dates: `${formatGcal(startDate)}/${formatGcal(endDate)}`,
      details: "In-home estimate visit\nContact: (530) 966-0752",
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
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            <span style={{ color: "#e04a2f" }}>Maid</span>{" "}
            <span>For Chico</span>
          </h1>
          <p className="text-xs uppercase tracking-[3px] text-accent mt-1">Select Your Estimate Time</p>
        </div>

        {status === "loading" && (
          <div className="py-12">
            <Loader2 className="w-10 h-10 animate-spin text-accent mx-auto" />
            <p className="text-muted-foreground mt-4">Loading...</p>
          </div>
        )}

        {status === "error" && (
          <div className="py-8 space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Oops!</h2>
            <p className="text-muted-foreground text-sm">{errorMsg}</p>
            <p className="text-muted-foreground text-sm">
              Call us at{" "}
              <a href="tel:5309660752" className="text-accent hover:underline">(530) 966-0752</a>
            </p>
          </div>
        )}

        {status === "ready" && date && time && (
          <div className="space-y-6">
            <CalendarCheck className="w-14 h-14 text-accent mx-auto" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">Confirm This Time?</h2>
              <p className="text-muted-foreground text-sm mt-2">
                Hi {booking?.name}, you selected the following time for your in-home estimate:
              </p>
            </div>

            <div className="bg-secondary/50 rounded-xl p-5 text-left space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">📅 Date</span>
                <span className="font-medium text-foreground">{formatDate(date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">🕐 Time</span>
                <span className="font-medium text-foreground">{formatTime12(time)}</span>
              </div>
              {booking && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">📍 Address</span>
                  <span className="font-medium text-foreground text-right">{booking.street}, {booking.city}</span>
                </div>
              )}
            </div>

            <Button
              onClick={handleConfirm}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-semibold rounded-xl"
            >
              ✅ Yes, This Time Works!
            </Button>

            <p className="text-muted-foreground text-xs">
              None of these times work? Reply to our email or call{" "}
              <a href="tel:5309660752" className="text-accent hover:underline">(530) 966-0752</a>
            </p>
          </div>
        )}

        {status === "confirming" && (
          <div className="py-12">
            <Loader2 className="w-10 h-10 animate-spin text-accent mx-auto" />
            <p className="text-muted-foreground mt-4">Locking in your time...</p>
          </div>
        )}

        {status === "confirmed" && (
          <div className="space-y-6">
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">You're All Set! 🎉</h2>
              <p className="text-muted-foreground text-sm mt-2">
                Your in-home estimate has been confirmed for:
              </p>
            </div>

            <div className="bg-secondary/50 rounded-xl p-5 text-left space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">📅 Date</span>
                <span className="font-medium text-foreground">{date && formatDate(date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">🕐 Time</span>
                <span className="font-medium text-foreground">{time && formatTime12(time)}</span>
              </div>
              {booking && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">📍 Address</span>
                  <span className="font-medium text-foreground text-right">{booking.street}, {booking.city}</span>
                </div>
              )}
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
                {icsUrl && (
                  <a
                    href={icsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl py-3 font-medium text-sm transition-colors border border-border"
                  >
                    📥 Download .ics
                  </a>
                )}
              </div>
            </div>

            <p className="text-muted-foreground text-xs">
              A calendar invite has been sent to your email. See you soon!
            </p>
          </div>
        )}

        {status === "already" && (
          <div className="space-y-6">
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">Already Confirmed</h2>
              <p className="text-muted-foreground text-sm mt-2">
                This estimate time has already been confirmed. Check your email for details, or call us at{" "}
                <a href="tel:5309660752" className="text-accent hover:underline">(530) 966-0752</a>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PickTime;
