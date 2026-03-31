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
    const { bookingId, paymentMethod, amount, fee } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (fetchErr || !booking) throw new Error("Booking not found");

    const feeAmount = parseFloat(fee) || 0;
    const paidAmount = parseFloat(amount) || 0;
    const currentTotalPaid = Number(booking.total_paid) || 0;
    const newTotalPaid = currentTotalPaid + paidAmount;

    // Calculate effective balance using deposit_override if set
    const rawItems: Array<{ description: string; amount: number }> = Array.isArray(booking.line_items) ? booking.line_items : [];
    const serviceItems = rawItems.filter((i) => !(i.description || "").toLowerCase().includes("deposit"));
    const subtotal = serviceItems.reduce((sum, i) => sum + Number(i.amount || 0), 0);
    const depositAmt = (booking.deposit_override !== null && booking.deposit_override !== undefined)
      ? Number(booking.deposit_override)
      : (booking.total_price && Number(booking.total_price) > 0 ? Number(booking.total_price) * 0.25 : 0);
    const balanceDue = subtotal - depositAmt;
    const effectiveBalance = balanceDue + feeAmount;
    const remaining = Math.max(0, effectiveBalance - newTotalPaid);

    const newStatus = remaining <= 0 ? "paid" : newTotalPaid > 0 ? "partially_paid" : "unpaid";

    const existingRef = booking.payment_reference || "";
    const methodLabel = paymentMethod === "ach" ? "ACH" : "Credit Card";
    const newRef = `STRIPE ${methodLabel} $${paidAmount.toFixed(2)}`;
    const combinedRef = existingRef ? `${existingRef}\n${newRef}` : newRef;

    const updateData: Record<string, unknown> = {
      payment_status: newStatus,
      payment_method: paymentMethod === "ach" ? "ach" : "credit_card",
      processing_fee: (Number(booking.processing_fee) || 0) + feeAmount,
      total_paid: newTotalPaid,
      paid_at: new Date().toISOString(),
      payment_reference: combinedRef,
    };

    // When fully paid, also mark the job status as completed
    if (newStatus === "paid") {
      updateData.status = "completed";
    }

    const { error: updateErr } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId);

    if (updateErr) throw updateErr;

    // Send admin notification email about payment received
    try {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        const adminEmail = "info@maidforchico.com";
        const firstName = booking.name ? booking.name.trim().split(/\s+/)[0] : "Customer";
        const statusLabel = newStatus === "paid" ? "FULLY PAID" : "PARTIAL PAYMENT";

        let htmlBody = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">`;
        htmlBody += `<div style="padding: 24px 24px 16px; text-align: center; border-bottom: 2px solid #e04a2f;">`;
        htmlBody += `<h1 style="margin: 0; font-size: 28px; font-weight: 800;"><span style="color: #e04a2f;">Maid</span> <span style="color: #1a1a1a;">For Chico</span></h1>`;
        htmlBody += `</div>`;
        htmlBody += `<div style="padding: 24px 20px;">`;
        htmlBody += `<div style="background: #ecfdf5; border: 1px solid #059669; border-radius: 8px; padding: 16px; margin-bottom: 16px; text-align: center;">`;
        htmlBody += `<p style="font-size: 20px; font-weight: bold; color: #059669; margin: 0;">💰 ${statusLabel}</p>`;
        htmlBody += `</div>`;
        htmlBody += `<p style="font-size: 15px; color: #333;"><strong>${firstName}</strong> just completed a payment:</p>`;
        htmlBody += `<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">`;
        htmlBody += `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Customer</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 600;">${booking.name}</td></tr>`;
        htmlBody += `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Amount Paid</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 600; color: #059669;">$${paidAmount.toFixed(2)}</td></tr>`;
        htmlBody += `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Method</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${methodLabel}</td></tr>`;
        if (feeAmount > 0) {
          htmlBody += `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Processing Fee</td><td style="padding: 8px; border-bottom: 1px solid #eee;">$${feeAmount.toFixed(2)}</td></tr>`;
        }
        htmlBody += `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Total Collected</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 600;">$${newTotalPaid.toFixed(2)}</td></tr>`;
        htmlBody += `<tr><td style="padding: 8px; color: #666;">Remaining</td><td style="padding: 8px; font-weight: 600; color: ${remaining > 0 ? '#dc2626' : '#059669'};">$${remaining.toFixed(2)}</td></tr>`;
        htmlBody += `</table>`;
        htmlBody += `<p style="font-size: 13px; color: #888;">Address: ${booking.street}, ${booking.city}, CA ${booking.zip}</p>`;
        htmlBody += `</div></div>`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Maid for Chico <info@maidforchico.com>",
            to: [adminEmail],
            subject: `💰 Payment Received: ${firstName} — $${paidAmount.toFixed(2)} (${statusLabel})`,
            html: htmlBody,
          }),
        });
      }
    } catch (emailErr) {
      console.error("Admin payment notification email error (non-blocking):", emailErr);
    }

    return new Response(JSON.stringify({ success: true, newStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("update-payment-status error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
