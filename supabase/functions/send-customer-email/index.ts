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
    const { customerEmail, customerName, subject, body, ctaUrl, ctaLabel, inReplyTo, references, cc } = await req.json();

    if (!customerEmail || !subject || !body) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not set");

    // Use capitalized first name only
    const firstName = customerName
      ? customerName.trim().split(/\s+/)[0].replace(/^\w/, (c: string) => c.toUpperCase())
      : "there";
    
    // Build HTML body with branded header
    let htmlBody = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">`;
    // Branded header — title only, no background
    htmlBody += `<div style="padding: 24px 24px 16px; text-align: center; border-bottom: 2px solid #e04a2f;">`;
    htmlBody += `<h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 0.5px; font-family: 'Playfair Display', Georgia, serif;"><span style="color: #e04a2f;">Maid</span> <span style="color: #1a1a1a;">For Chico</span></h1>`;
    htmlBody += `</div>`;
    // Body content
    htmlBody += `<div style="padding: 24px 20px;">`;
    htmlBody += `<p style="font-size: 15px; color: #333; line-height: 1.6;">Hi ${firstName},</p>`;
    htmlBody += `<div style="font-size: 15px; color: #333; line-height: 1.6; white-space: pre-wrap;">${body.replace(/\n/g, "<br>")}</div>`;
    
    if (ctaUrl && ctaLabel) {
      htmlBody += `<div style="margin: 24px 0;"><a href="${ctaUrl}" style="display: inline-block; background-color: #059669; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px;">${ctaLabel}</a></div>`;
    }
    
    htmlBody += `</div></div>`;

    const emailPayload: Record<string, any> = {
      from: "Maid for Chico <info@maidforchico.com>",
      to: [customerEmail],
      subject,
      html: htmlBody,
    };

    if (cc && Array.isArray(cc) && cc.length > 0) {
      emailPayload.cc = cc;
    } else if (typeof cc === "string" && cc.trim()) {
      emailPayload.cc = [cc];
    }

    if (inReplyTo) {
      emailPayload.headers = {
        "In-Reply-To": inReplyTo,
        ...(references ? { References: references } : {}),
      };
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Resend API error");

    return new Response(JSON.stringify({ success: true, messageId: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-customer-email error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
