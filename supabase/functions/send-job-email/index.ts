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

function formatLabel(s: string): string {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, type } = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (fetchErr || !booking) throw new Error("Booking not found");

    const firstName = (booking.name || "").trim().split(/\s+/)[0] || "there";
    const titleName = booking.name.replace(/\b\w/g, (c: string) => c.toUpperCase());
    const serviceLabel = formatLabel(booking.service_type);
    const total = booking.total_price ? `$${Number(booking.total_price).toFixed(2)}` : "TBD";

    let subject = "";
    let bodyText = "";

    switch (type) {
      case "quote": {
        const approveUrl = booking.confirmation_token
          ? `https://maidforchico.com/approve-quote?token=${booking.confirmation_token}`
          : "";
        subject = "Your Cleaning Estimate — Maid for Chico";
        bodyText = `Thank you for letting us visit your home! Based on our walk-through, here is your personalized cleaning estimate:\n\n🏠 Service: ${serviceLabel}\n📍 Address: ${booking.street}, ${booking.city}, CA ${booking.zip}\n📐 Size: ${booking.sqft ? booking.sqft + " sqft" : "N/A"} | ${booking.bedrooms || "—"} bed / ${booking.bathrooms || "—"} bath\n📋 Frequency: ${formatLabel(booking.frequency)}\n\n💰 Estimated Quote: ${total} per visit\n\n✅ To approve this estimate and book your cleaning:\n${approveUrl}\n\nOr call us at (530) 966-0752.\n\nBetty & the Maid for Chico Team`;
        break;
      }
      case "receipt": {
        subject = `Cleaning Receipt — ${booking.scheduled_date || booking.preferred_date}`;
        const items = Array.isArray(booking.line_items) ? booking.line_items : [];
        let itemsList = items.map((i: any) => `• ${i.description}: $${Number(i.amount).toFixed(2)}`).join("\n");
        bodyText = `Thank you for choosing Maid for Chico! Here's your receipt:\n\n📅 Date: ${booking.scheduled_date || booking.preferred_date}\n🏠 Service: ${serviceLabel}\n📍 Address: ${booking.street}, ${booking.city}, CA ${booking.zip}\n\n${itemsList ? "Services:\n" + itemsList + "\n\n" : ""}💰 Total: ${total}\n\nThank you for your business!\nBetty & the Maid for Chico Team`;
        break;
      }
      case "approval": {
        subject = `Your Cleaning Has Been Approved! — Maid for Chico`;
        bodyText = `Great news — your cleaning request has been approved! 🎉\n\n🏠 Service: ${serviceLabel}\n📍 Address: ${booking.street}, ${booking.city}, CA ${booking.zip}\n💰 Price: ${total}\n\nWe'll be in touch shortly to schedule your cleaning date. If you have any questions, call us at (530) 966-0752.\n\nBetty & the Maid for Chico Team`;
        break;
      }
      case "scheduled": {
        const schedDate = booking.scheduled_date || booking.preferred_date;
        const schedTime = formatTime12(booking.scheduled_time || booking.preferred_time);
        subject = `Your Cleaning is Scheduled! — ${schedDate}`;
        bodyText = `Your cleaning has been scheduled! 🧹✨\n\n📅 Date: ${schedDate}\n🕐 Time: ${schedTime}\n📍 Address: ${booking.street}, ${booking.city}, CA ${booking.zip}\n🏠 Service: ${serviceLabel}\n\nPlease make sure we have access to your home at the scheduled time. If you need to reschedule, please let us know at least 24 hours in advance.\n\nWe look forward to making your home sparkle!\nBetty & the Maid for Chico Team`;
        break;
      }
      case "cancellation": {
        subject = `Booking Cancelled — Maid for Chico`;
        const fee = booking.cancellation_fee ? `\n\n⚠️ A cancellation fee of $${Number(booking.cancellation_fee).toFixed(2)} applies due to late cancellation (less than 24 hours notice).` : "";
        bodyText = `We've received your cancellation request for your cleaning appointment.\n\n📍 Address: ${booking.street}, ${booking.city}, CA ${booking.zip}\n📅 Original Date: ${booking.scheduled_date || booking.preferred_date}${fee}\n\nIf you'd like to rebook in the future, we'd love to hear from you! Call us at (530) 966-0752.\n\nBetty & the Maid for Chico Team`;
        break;
      }
      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    const htmlBody = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <p style="font-size: 15px; color: #333;">Hi ${firstName},</p>
      <div style="font-size: 15px; color: #333; line-height: 1.6; white-space: pre-wrap;">${bodyText.replace(/\n/g, "<br>")}</div>
    </div>`;

    // Send to customer
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Maid for Chico <info@maidforchico.com>",
        to: [booking.email],
        bcc: ["info@maidforchico.com"],
        subject,
        html: htmlBody,
      }),
    });

    // Log communication
    await supabase.from("customer_communications").insert({
      booking_id: bookingId,
      customer_id: booking.customer_id || null,
      type: "email",
      subject,
      body: bodyText,
      direction: "outbound",
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-job-email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
