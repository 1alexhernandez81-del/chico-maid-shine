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
    const payload = await req.json();
    console.log("Inbound email payload:", JSON.stringify(payload).slice(0, 500));

    // Parse Resend inbound webhook payload
    const fromEmail = (payload.from || "").replace(/.*<([^>]+)>.*/, "$1").toLowerCase().trim();
    const subject = payload.subject || "";
    const textBody = payload.text || payload.body || "";
    const headers = payload.headers || {};
    const messageId = headers["message-id"] || payload.message_id || null;
    const inReplyTo = headers["in-reply-to"] || null;
    const references = headers["references"] || null;

    if (!fromEmail) {
      return new Response(JSON.stringify({ error: "No sender email found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find customer by email
    let customerId: string | null = null;
    let bookingId: string | null = null;

    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .ilike("email", fromEmail)
      .limit(1)
      .single();

    if (customer) {
      customerId = customer.id;
    }

    // Also check bookings for email match (covers leads not yet in customers)
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, customer_id")
      .ilike("email", fromEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (booking) {
      bookingId = booking.id;
      if (!customerId && booking.customer_id) {
        customerId = booking.customer_id;
      }
    }

    // Find thread: match in-reply-to against email_message_id
    let threadId: string | null = null;

    if (inReplyTo) {
      const { data: match } = await supabase
        .from("customer_communications")
        .select("thread_id")
        .eq("email_message_id", inReplyTo)
        .limit(1)
        .single();
      if (match) threadId = match.thread_id;
    }

    // Fallback: check references header
    if (!threadId && references) {
      const refIds = references.split(/\s+/).filter(Boolean);
      for (const ref of refIds) {
        const { data: match } = await supabase
          .from("customer_communications")
          .select("thread_id")
          .eq("email_message_id", ref)
          .limit(1)
          .single();
        if (match) {
          threadId = match.thread_id;
          break;
        }
      }
    }

    // Fallback: subject line matching (strip Re:/Fwd: prefixes)
    if (!threadId && subject) {
      const cleanSubject = subject.replace(/^(re|fwd|fw):\s*/gi, "").trim();
      if (cleanSubject) {
        const { data: match } = await supabase
          .from("customer_communications")
          .select("thread_id")
          .ilike("subject", `%${cleanSubject}%`)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (match) threadId = match.thread_id;
      }
    }

    // Insert the inbound communication
    const { error: insertError } = await supabase
      .from("customer_communications")
      .insert({
        customer_id: customerId,
        booking_id: bookingId,
        type: "email",
        subject,
        body: textBody,
        direction: "inbound",
        thread_id: threadId || crypto.randomUUID(),
        email_message_id: messageId,
        in_reply_to: inReplyTo,
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, customerId, bookingId, threadId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("receive-inbound-email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
