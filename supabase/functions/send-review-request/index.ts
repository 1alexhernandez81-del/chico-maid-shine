const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, email, name } = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not set");

    const firstName = (name || "").trim().split(/\s+/)[0] || "there";

    const htmlBody = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="padding: 24px 24px 16px; text-align: center; border-bottom: 2px solid #e04a2f;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 0.5px; font-family: 'Playfair Display', Georgia, serif;"><span style="color: #e04a2f;">Maid</span> <span style="color: #1a1a1a;">For Chico</span></h1>
      </div>
      <div style="padding: 24px 20px;">
      <p style="font-size: 15px; color: #333;">Hi ${firstName},</p>
      <p style="font-size: 15px; color: #333; line-height: 1.6;">
        Thank you so much for choosing Maid for Chico! We hope your home is looking and feeling fresh. ✨
      </p>
      <p style="font-size: 15px; color: #333; line-height: 1.6;">
        If you have a moment, we'd truly appreciate a quick review — it helps us grow and serve more families like yours:
      </p>
      <div style="margin: 20px 0;">
        <a href="https://www.google.com/maps/place/Maid+For+Chico/@39.7238225,-122.007554,9z/data=!4m8!3m7!1s0x8082d9f21b5035d3:0x189f9dfb3b334fcb!8m2!3d39.7238225!4d-122.007554!9m1!1b1!16s%2Fg%2F11ghnxkzp4?entry=ttu" style="display: inline-block; background-color: #b5a26a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 10px;">⭐ Review on Google</a>
        <a href="https://www.yelp.com/biz/maid-for-chico-chico" style="display: inline-block; background-color: #d32323; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">⭐ Review on Yelp</a>
      </div>
      <p style="font-size: 14px; color: #666; line-height: 1.5;">
        P.S. Did you know about our referral program? Refer a friend and you BOTH get $25 off your next cleaning! 
        <a href="https://maidforchico.com/refer" style="color: #b5a26a;">Share your referral link →</a>
      </p>
      <p style="font-size: 15px; color: #333;">Betty & the Maid for Chico Team</p>
      </div>
    </div>`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Maid for Chico <info@maidforchico.com>",
        to: [email],
        subject: "Thank You from Maid for Chico! 💛",
        html: htmlBody,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-review-request error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
