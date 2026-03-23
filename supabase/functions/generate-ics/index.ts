import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const bookingId = url.searchParams.get("bookingId");
    if (!bookingId) {
      return new Response("Missing bookingId", { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      return new Response("Booking not found", { status: 404, headers: corsHeaders });
    }

    const date = booking.scheduled_date || booking.preferred_date;
    const time = booking.scheduled_time || booking.preferred_time || "09:00";
    const [year, month, day] = (date || "2025-01-01").split("-");
    const timeParts = (time || "09:00").split(":");
    const hour = (timeParts[0] || "09").padStart(2, "0");
    const minute = (timeParts[1] || "00").padStart(2, "0");

    const dtStart = `${year}${month}${day}T${hour}${minute}00`;

    // 30 min for estimate-scheduled, 2 hours for all others
    const isEstimate = booking.status === "estimate-scheduled";
    const durationMinutes = isEstimate ? 30 : 120;
    const endHour = parseInt(hour) + Math.floor((parseInt(minute) + durationMinutes) / 60);
    const endMinute = (parseInt(minute) + durationMinutes) % 60;
    const dtEnd = `${year}${month}${day}T${endHour.toString().padStart(2, "0")}${endMinute.toString().padStart(2, "0")}00`;

    const address = `${booking.street}, ${booking.city}, CA ${booking.zip}`;
    const serviceType = (booking.service_type || "cleaning").replace(/-/g, " ");
    const now = new Date();
    const dtstamp = `${now.getUTCFullYear()}${(now.getUTCMonth()+1).toString().padStart(2,"0")}${now.getUTCDate().toString().padStart(2,"0")}T${now.getUTCHours().toString().padStart(2,"0")}${now.getUTCMinutes().toString().padStart(2,"0")}${now.getUTCSeconds().toString().padStart(2,"0")}Z`;

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Maid For Chico//Booking//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VTIMEZONE",
      "TZID:America/Los_Angeles",
      "BEGIN:DAYLIGHT",
      "TZOFFSETFROM:-0800",
      "TZOFFSETTO:-0700",
      "TZNAME:PDT",
      "DTSTART:19700308T020000",
      "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
      "END:DAYLIGHT",
      "BEGIN:STANDARD",
      "TZOFFSETFROM:-0700",
      "TZOFFSETTO:-0800",
      "TZNAME:PST",
      "DTSTART:19701101T020000",
      "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
      "END:STANDARD",
      "END:VTIMEZONE",
      "BEGIN:VEVENT",
      `UID:${booking.id}@maidforchico.com`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=America/Los_Angeles:${dtStart}`,
      `DTEND;TZID=America/Los_Angeles:${dtEnd}`,
      `SUMMARY:Cleaning Service - Maid For Chico`,
      `DESCRIPTION:${serviceType} cleaning\\nContact: (530) 966-0752`,
      `LOCATION:${address}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    return new Response(ics, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="maid-for-chico-appointment.ics"`,
      },
    });
  } catch (err: unknown) {
    console.error("generate-ics error:", err);
    return new Response((err as Error).message, { status: 500, headers: corsHeaders });
  }
});
