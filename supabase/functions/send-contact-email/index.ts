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
    const data = await req.json();
    const {
      name, email, phone, street, city, zip,
      serviceType, otherService, sqft, bedrooms, bathrooms,
      frequency, estimateDate, estimateTime,
      preferredDate, preferredTime, notes,
    } = data;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert booking
    const { error: insertError } = await supabase.from("bookings").insert({
      name,
      email,
      phone,
      street,
      city,
      zip,
      service_type: serviceType === "other" ? (otherService || "other") : serviceType,
      sqft: sqft || null,
      bedrooms: bedrooms || null,
      bathrooms: bathrooms || null,
      frequency,
      preferred_date: preferredDate,
      preferred_time: preferredTime || null,
      estimate_date: estimateDate || null,
      estimate_time: estimateTime || null,
      notes: notes || null,
      status: "pending",
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save booking");
    }

    // Log contact
    const userAgent = req.headers.get("user-agent") || null;
    await supabase.from("contact_logs").insert({
      channel: "schedule-form",
      source_page: "/schedule",
      user_agent: userAgent,
    });

    const serviceDisplay = serviceType === "other" ? (otherService || "Other") : serviceType;

    // Send notification to business
    const businessHtml = `
      <h2 style="font-family: Arial; color: #333;">New Cleaning Request</h2>
      <table style="font-family: Arial; font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">Name:</td><td>${name}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">Email:</td><td>${email}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">Phone:</td><td>${phone}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">Address:</td><td>${street}, ${city}, CA ${zip}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">Service:</td><td>${serviceDisplay}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">Frequency:</td><td>${frequency}</td></tr>
        ${sqft ? `<tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">Sq Ft:</td><td>${sqft}</td></tr>` : ""}
        ${bedrooms ? `<tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">Bedrooms:</td><td>${bedrooms}</td></tr>` : ""}
        ${bathrooms ? `<tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">Bathrooms:</td><td>${bathrooms}</td></tr>` : ""}
        <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">Estimate Date:</td><td>${estimateDate}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">Estimate Time:</td><td>${estimateTime}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">Preferred Date:</td><td>${preferredDate}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">Preferred Time:</td><td>${preferredTime}</td></tr>
        ${notes ? `<tr><td style="padding: 4px 12px 4px 0; font-weight: bold;">Notes:</td><td>${notes}</td></tr>` : ""}
      </table>
    `;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Maid for Chico <info@maidforchico.com>",
        to: ["info@maidforchico.com"],
        subject: `🧹 New Cleaning Request — ${name}`,
        html: businessHtml,
      }),
    });

    // Send confirmation to customer
    const customerHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <p style="font-size: 15px; color: #333;">Hi ${name.split(" ")[0]},</p>
        <p style="font-size: 15px; color: #333; line-height: 1.6;">
          Thank you for reaching out to Maid for Chico! We've received your cleaning request and will get back to you shortly to schedule your in-home estimate.
        </p>
        <p style="font-size: 15px; color: #333; line-height: 1.6;">
          In the meantime, if you have any questions, feel free to call us at <strong>(530) 966-0752</strong>.
        </p>
        <p style="font-size: 15px; color: #333;">Thank you!<br>Betty & the Maid for Chico Team</p>
      </div>
    `;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Maid for Chico <info@maidforchico.com>",
        to: [email],
        bcc: ["info@maidforchico.com"],
        subject: "We Received Your Request — Maid for Chico",
        html: customerHtml,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-contact-email error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
