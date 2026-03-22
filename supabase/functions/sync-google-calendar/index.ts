import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatTime12(time: string | null): string {
  if (!time) return "TBD";
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

async function getAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);
  
  // Create JWT header and claim set
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(String.fromCharCode(...encoder.encode(JSON.stringify(header)))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const claimB64 = btoa(String.fromCharCode(...encoder.encode(JSON.stringify(claimSet)))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signInput = `${headerB64}.${claimB64}`;

  // Import private key and sign
  const pemContent = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey("pkcs8", binaryKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, encoder.encode(signInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${signInput}.${sigB64}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error("Failed to get access token");
  return tokenData.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, action } = await req.json();

    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID");
    if (!serviceAccountJson || !calendarId) throw new Error("Google Calendar not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (fetchErr || !booking) throw new Error("Booking not found");

    const accessToken = await getAccessToken(serviceAccountJson);
    const calBase = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

    if (action === "delete") {
      if (booking.google_calendar_event_id) {
        await fetch(`${calBase}/${booking.google_calendar_event_id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        await supabase.from("bookings").update({ google_calendar_event_id: null }).eq("id", bookingId);
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine if estimate or cleaning
    const isEstimate = booking.status === "estimate-scheduled";
    const eventDate = isEstimate
      ? (booking.estimate_date || booking.preferred_date)
      : (booking.scheduled_date || booking.preferred_date);
    const eventTime = isEstimate
      ? (booking.estimate_time || "09:00")
      : (booking.scheduled_time || "09:00");
    const durationMinutes = isEstimate ? 30 : 120;

    const titleName = booking.name.replace(/\b\w/g, (c: string) => c.toUpperCase());
    const prefix = isEstimate ? "📋 ESTIMATE" : "🧹 CLEANING";
    const summary = `${prefix} — ${titleName}`;
    const description = `${booking.service_type.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}\n📍 ${booking.street}, ${booking.city}, CA ${booking.zip}\n📞 ${booking.phone}\n✉️ ${booking.email}${booking.notes ? `\n📝 ${booking.notes}` : ""}`;
    const location = `${booking.street}, ${booking.city}, CA ${booking.zip}`;

    // Parse date and time
    const [year, month, day] = eventDate.includes("-") ? eventDate.split("-") : [eventDate.split("/")[2], eventDate.split("/")[0], eventDate.split("/")[1]];
    const startDateTime = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${eventTime}:00`;
    const startDate = new Date(startDateTime);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    const endDateTime = endDate.toISOString().replace("Z", "");

    const eventBody = {
      summary,
      description,
      location,
      start: { dateTime: `${startDateTime}-08:00`, timeZone: "America/Los_Angeles" },
      end: { dateTime: `${endDateTime.split(".")[0]}-08:00`, timeZone: "America/Los_Angeles" },
    };

    let eventId = booking.google_calendar_event_id;

    if (action === "update" && eventId) {
      await fetch(`${calBase}/${eventId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      });
    } else {
      const res = await fetch(calBase, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      });
      const eventData = await res.json();
      if (!res.ok) throw new Error(eventData.error?.message || "Calendar API error");
      eventId = eventData.id;
    }

    // Store event ID
    await supabase.from("bookings").update({ google_calendar_event_id: eventId }).eq("id", bookingId);

    return new Response(JSON.stringify({ success: true, eventId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sync-google-calendar error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
