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

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function buildCalendarInviteIcs(booking: any): string | null {
  const rawDate = booking.scheduled_date || booking.preferred_date;
  if (!rawDate) return null;

  const rawTime = String(booking.scheduled_time || booking.preferred_time || "09:00").slice(0, 5);
  const [year, month, day] = rawDate.split("-");
  if (!year || !month || !day) return null;

  const [hourRaw, minuteRaw] = rawTime.split(":");
  const hour = Number.parseInt(hourRaw || "9", 10);
  const minute = Number.parseInt(minuteRaw || "0", 10);

  const durationMinutes = booking.status === "estimate-scheduled" ? 30 : 120;
  const startDateTime = `${year}${month.padStart(2, "0")}${day.padStart(2, "0")}T${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}00`;

  const endTotal = hour * 60 + minute + durationMinutes;
  const endHour = Math.floor(endTotal / 60);
  const endMinute = endTotal % 60;
  const endDateTime = `${year}${month.padStart(2, "0")}${day.padStart(2, "0")}T${String(endHour).padStart(2, "0")}${String(endMinute).padStart(2, "0")}00`;

  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}T${String(now.getUTCHours()).padStart(2, "0")}${String(now.getUTCMinutes()).padStart(2, "0")}${String(now.getUTCSeconds()).padStart(2, "0")}Z`;

  const summary = escapeIcsText(
    booking.status === "estimate-scheduled" ? "Maid For Chico - In-Home Estimate" : "Maid For Chico - Cleaning Service",
  );
  const location = escapeIcsText(`${booking.street}, ${booking.city}, CA ${booking.zip}`);
  const description = escapeIcsText(
    `${formatLabel(booking.service_type)}\n${booking.street}, ${booking.city}, CA ${booking.zip}\nPhone: ${booking.phone}`,
  );

  const customerEmail = String(booking.email || "").trim();
  const attendees = [
    customerEmail
      ? `ATTENDEE;CN=${escapeIcsText(booking.name || "Customer")};PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${customerEmail}`
      : "",
    "ATTENDEE;CN=Maid For Chico;PARTSTAT=ACCEPTED:mailto:info@maidforchico.com",
  ].filter(Boolean);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Maid For Chico//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
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
    `DTSTART;TZID=America/Los_Angeles:${startDateTime}`,
    `DTEND;TZID=America/Los_Angeles:${endDateTime}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "SEQUENCE:0",
    "ORGANIZER;CN=Maid For Chico:mailto:info@maidforchico.com",
    ...attendees,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
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
    const titleName = (booking.name || "Customer").replace(/\b\w/g, (c: string) => c.toUpperCase());
    const serviceLabel = formatLabel(booking.service_type);
    const total = booking.total_price ? `$${Number(booking.total_price).toFixed(2)}` : "TBD";

    let subject = "";
    let bodyText = "";
    let ctaUrl = "";
    let ctaLabel = "";
    let confirmationToken: string | null = booking.confirmation_token;
    let recipients: string[] = [booking.email];
    let attachments: Array<{ filename: string; content: string; contentType: string }> | undefined;

    if (type === "quote" && !confirmationToken) {
      confirmationToken = crypto.randomUUID();
      const { error: tokenError } = await supabase
        .from("bookings")
        .update({ confirmation_token: confirmationToken })
        .eq("id", bookingId);

      if (tokenError) {
        throw new Error("Unable to create quote approval link");
      }
    }

    switch (type) {
      case "quote": {
        const approveUrl = confirmationToken
          ? `https://maidforchico.com/approve-quote?token=${confirmationToken}`
          : "";
        subject = "Your Cleaning Estimate — Maid for Chico";
        bodyText = `Thank you for letting us visit your home! Based on our walk-through, here is your personalized cleaning estimate:\n\n🏠 Service: ${serviceLabel}\n📍 Address: ${booking.street}, ${booking.city}, CA ${booking.zip}\n📐 Size: ${booking.sqft ? booking.sqft + " sqft" : "N/A"} | ${booking.bedrooms || "—"} bed / ${booking.bathrooms || "—"} bath\n📋 Frequency: ${formatLabel(booking.frequency)}\n\n💰 Estimated Quote: ${total} per visit\n\n⚠️ Please note: This is an estimate and is subject to change depending on additional services requested or removed at the time of cleaning.\n\n💳 DEPOSIT: A 25% deposit is required to secure your cleaning date. We'll collect the deposit once you approve. The remaining balance is due on the day of your cleaning.\n\nOr call us at (530) 966-0752.\n\nWe'd love to make your home sparkle!\nBetty & the Maid for Chico Team`;
        if (approveUrl) {
          ctaUrl = approveUrl;
          ctaLabel = "✅ Approve Quote & Book Cleaning";
        }
        break;
      }
      case "receipt": {
        subject = `Cleaning Receipt — ${booking.scheduled_date || booking.preferred_date}`;
        const rawItems: Array<{ description: string; amount: number }> = Array.isArray(booking.line_items) ? booking.line_items : [];
        // Filter out any legacy deposit line items
        const serviceItems = rawItems.filter((i: any) => !(i.description || "").toLowerCase().includes("deposit"));
        const itemsList = serviceItems.map((i: any) => `• ${i.description}: $${Number(i.amount).toFixed(2)}`).join("\n");
        const subtotal = serviceItems.reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0);
        const depositAmt = booking.total_price && Number(booking.total_price) > 0 ? Number(booking.total_price) * 0.25 : 0;
        const balanceDue = subtotal - depositAmt;

        let pricingBlock = "";
        if (itemsList) {
          pricingBlock += `Services:\n${itemsList}\n\n`;
          pricingBlock += `Subtotal: $${subtotal.toFixed(2)}\n`;
          if (depositAmt > 0) {
            pricingBlock += `Deposit already collected (25%): ($${depositAmt.toFixed(2)})\n`;
          }
          pricingBlock += `Balance due: $${balanceDue.toFixed(2)}`;
        } else {
          pricingBlock += `💰 Total: ${total}`;
        }

        bodyText = `Thank you for choosing Maid for Chico! Here's your receipt:\n\n📅 Date: ${booking.scheduled_date || booking.preferred_date}\n🏠 Service: ${serviceLabel}\n📍 Address: ${booking.street}, ${booking.city}, CA ${booking.zip}\n\n${pricingBlock}\n\nThank you for your business!\nBetty & the Maid for Chico Team`;
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

        recipients = Array.from(new Set([booking.email, "info@maidforchico.com"].filter(Boolean)));

        const inviteIcs = buildCalendarInviteIcs(booking);
        if (inviteIcs) {
          attachments = [{
            filename: "maid-for-chico-appointment.ics",
            content: btoa(inviteIcs),
            contentType: "text/calendar; charset=utf-8; method=REQUEST",
          }];
        }
        break;
      }
      case "cancellation": {
        subject = `Booking Cancelled — Maid for Chico`;
        const fee = booking.cancellation_fee ? `\n\n⚠️ A cancellation fee of $${Number(booking.cancellation_fee).toFixed(2)} applies due to late cancellation (less than 24 hours notice).` : "";
        bodyText = `We've received your cancellation request for your cleaning appointment.\n\n📍 Address: ${booking.street}, ${booking.city}, CA ${booking.zip}\n📅 Original Date: ${booking.scheduled_date || booking.preferred_date}${fee}\n\nIf you'd like to rebook in the future, we'd love to hear from you! Call us at (530) 966-0752.\n\nBetty & the Maid for Chico Team`;
        break;
      }
      case "quote-approved-admin": {
        subject = `✅ Quote Approved — ${titleName}`;
        bodyText = `${titleName} has approved their cleaning quote!\n\n🏠 Service: ${serviceLabel}\n📍 Address: ${booking.street}, ${booking.city}, CA ${booking.zip}\n📞 Phone: ${booking.phone}\n✉️ Email: ${booking.email}\n💰 Quoted Price: ${total}\n📋 Frequency: ${formatLabel(booking.frequency)}\n\n💳 Next Step: Collect the 25% deposit via Zelle to (530) 966-0752, then schedule the cleaning.\n\nLog into your admin dashboard to manage this booking.`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Maid for Chico <info@maidforchico.com>",
            to: ["info@maidforchico.com"],
            subject,
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="padding: 24px 24px 16px; text-align: center; border-bottom: 2px solid #059669;">
                <h1 style="margin: 0; font-size: 24px; color: #059669;">✅ Quote Approved!</h1>
              </div>
              <div style="padding: 24px 20px; font-size: 15px; color: #333; line-height: 1.6; white-space: pre-wrap;">${bodyText.replace(/\n/g, "<br>")}</div>
            </div>`,
          }),
        });

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
      }
      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    let htmlBody = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">`;
    htmlBody += `<div style="padding: 24px 24px 16px; text-align: center; border-bottom: 2px solid #e04a2f;">`;
    htmlBody += `<h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 0.5px; font-family: 'Playfair Display', Georgia, serif;"><span style="color: #e04a2f;">Maid</span> <span style="color: #1a1a1a;">For Chico</span></h1>`;
    htmlBody += `</div>`;
    htmlBody += `<div style="padding: 24px 20px;">`;
    htmlBody += `<p style="font-size: 15px; color: #333; line-height: 1.6;">Hi ${firstName},</p>`;
    htmlBody += `<div style="font-size: 15px; color: #333; line-height: 1.6; white-space: pre-wrap;">${bodyText.replace(/\n/g, "<br>")}</div>`;
    if (ctaUrl && ctaLabel) {
      htmlBody += `<div style="margin: 24px 0;"><a href="${ctaUrl}" style="display: inline-block; background-color: #059669; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px;">${ctaLabel}</a></div>`;
    }
    htmlBody += `</div></div>`;

    const emailPayload: Record<string, unknown> = {
      from: "Maid for Chico <info@maidforchico.com>",
      to: recipients,
      subject,
      html: htmlBody,
    };

    if (attachments && attachments.length > 0) {
      emailPayload.attachments = attachments;
    }

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

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
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
