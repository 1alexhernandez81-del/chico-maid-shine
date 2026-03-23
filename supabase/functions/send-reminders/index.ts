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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get tomorrow's date in America/Los_Angeles
    const now = new Date();
    const laFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    // Add 1 day
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = laFormatter.format(tomorrow);

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("scheduled_date", tomorrowStr)
      .eq("status", "scheduled")
      .is("reminded_at", null);

    if (error) throw error;
    if (!bookings || bookings.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    for (const b of bookings) {
      const scheduledTime = b.scheduled_time || b.preferred_time || "Morning";
      const address = `${b.street}, ${b.city}, CA ${b.zip}`;
      const serviceType = (b.service_type || "cleaning").replace(/-/g, " ");
      const titleName = b.name || "there";

      // Format time for display
      let displayTime = scheduledTime;
      if (scheduledTime.includes(":")) {
        const [h, m] = scheduledTime.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        displayTime = `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
      }

      // Format date for display
      const [yr, mo, dy] = (b.scheduled_date || b.preferred_date).split("-").map(Number);
      const dateObj = new Date(yr, mo - 1, dy);
      const displayDate = dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      const confirmUrl = b.confirmation_token
        ? `https://chico-maid-shine.lovable.app/confirm-appointment?token=${b.confirmation_token}`
        : "";

      const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #1a1a1a; padding: 28px 24px; text-align: center; border-radius: 8px 8px 0 0; border-bottom: 1px solid #333;">
    <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 0.5px; font-family: 'Playfair Display', Georgia, serif;"><span style="color: #e04a2f;">Maid</span> <span style="color: #ebebeb;">For Chico</span></h1>
  </div>
  <div style="padding: 24px 20px;">
  <p style="font-size: 15px; color: #333; line-height: 1.6;">Hi ${titleName},</p>
  <p style="font-size: 15px; color: #333; line-height: 1.6;">This is a friendly reminder that your cleaning appointment is <strong>tomorrow</strong>!</p>
  
  <div style="background: #f8f7f4; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <p style="margin: 8px 0; font-size: 15px; color: #333;">📅 <strong>${displayDate}</strong></p>
    <p style="margin: 8px 0; font-size: 15px; color: #333;">🕐 <strong>${displayTime}</strong></p>
    <p style="margin: 8px 0; font-size: 15px; color: #333;">📍 <strong>${address}</strong></p>
    <p style="margin: 8px 0; font-size: 15px; color: #333;">🧹 <strong>${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}</strong></p>
  </div>

  <p style="font-size: 15px; color: #333; line-height: 1.6;"><strong>To prepare for your cleaning:</strong></p>
  <ul style="font-size: 14px; color: #555; line-height: 1.8;">
    <li>Please make sure we can access your home</li>
    <li>Secure any pets if needed</li>
    <li>Clear any clutter from surfaces you'd like cleaned</li>
  </ul>

  ${confirmUrl ? `<div style="margin: 24px 0; text-align: center;"><a href="${confirmUrl}" style="display: inline-block; background-color: #059669; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px;">Confirm Appointment</a></div>` : ""}

  <div style="background: #fef9ee; border-left: 4px solid #d4a843; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
    <p style="font-size: 14px; color: #333; margin: 0 0 8px 0; font-weight: bold;">📋 Cancellation Policy</p>
    <ul style="font-size: 13px; color: #555; line-height: 1.8; margin: 0; padding-left: 20px;">
      <li><strong>More than 48 hours</strong> before your appointment — cancel free of charge</li>
      <li><strong>24 to 48 hours</strong> before — your 25% deposit is non-refundable</li>
      <li><strong>Less than 24 hours or no-show</strong> — deposit forfeited plus a $50 rebooking fee applies</li>
    </ul>
    <p style="font-size: 13px; color: #555; margin: 12px 0 0 0;">To reschedule, call us at <a href="tel:5309660752" style="color: #e04a2f;">(530) 966-0752</a> or reply to this email.</p>
  </div>

  <p style="font-size: 15px; color: #333; line-height: 1.6;">We look forward to seeing you tomorrow!</p>
  <p style="font-size: 15px; color: #333; line-height: 1.6;">— The Maid For Chico Team</p>
  </div>
</div>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Maid For Chico <info@maidforchico.com>",
          to: [b.email],
          bcc: ["info@maidforchico.com"],
          subject: `Reminder: Your Cleaning is Tomorrow – ${displayDate}`,
          html,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        console.error(`Failed to send reminder for booking ${b.id}:`, errData);
        continue;
      }

      // Mark as reminded
      await supabase
        .from("bookings")
        .update({ reminded_at: new Date().toISOString() })
        .eq("id", b.id);

      sent++;
    }

    return new Response(JSON.stringify({ sent, total: bookings.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("send-reminders error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
