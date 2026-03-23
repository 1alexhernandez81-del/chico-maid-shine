import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY is not configured — connect Twilio first");

    const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");
    if (!TWILIO_FROM_NUMBER) throw new Error("TWILIO_FROM_NUMBER is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { booking_id, cleaner_ids } = await req.json();

    if (!booking_id || !cleaner_ids?.length) {
      return new Response(JSON.stringify({ error: "booking_id and cleaner_ids required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch booking details
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("name, street, city, scheduled_date, scheduled_time, service_type")
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch cleaners with phone numbers
    const { data: cleaners } = await supabase
      .from("cleaners")
      .select("id, name, phone")
      .in("id", cleaner_ids);

    const results: { cleaner: string; success: boolean; error?: string }[] = [];

    for (const cleaner of (cleaners || [])) {
      if (!cleaner.phone) {
        results.push({ cleaner: cleaner.name, success: false, error: "No phone number" });
        continue;
      }

      // Clean phone number — ensure E.164 format
      let phone = cleaner.phone.replace(/[\s\-\(\)]/g, "");
      if (!phone.startsWith("+")) {
        phone = "+1" + phone; // Default to US
      }

      const dateStr = booking.scheduled_date || "TBD";
      const timeStr = booking.scheduled_time || "TBD";
      const serviceType = (booking.service_type || "").replace(/-/g, " ");

      const message =
        `🧹 New Job Assigned!\n\n` +
        `Hi ${cleaner.name}, you've been assigned to a ${serviceType} job.\n\n` +
        `📍 ${booking.street}, ${booking.city}\n` +
        `📅 ${dateStr} at ${timeStr}\n` +
        `👤 Customer: ${booking.name}\n\n` +
        `Open your app to accept & start the timer.`;

      try {
        const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": TWILIO_API_KEY,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: phone,
            From: TWILIO_FROM_NUMBER,
            Body: message,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          results.push({ cleaner: cleaner.name, success: false, error: `Twilio error [${response.status}]: ${JSON.stringify(data)}` });
        } else {
          results.push({ cleaner: cleaner.name, success: true });
        }
      } catch (err) {
        results.push({ cleaner: cleaner.name, success: false, error: String(err) });
      }
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("SMS notification error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
