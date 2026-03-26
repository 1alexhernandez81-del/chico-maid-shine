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

    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        payment_status: newStatus,
        payment_method: paymentMethod === "ach" ? "ach" : "credit_card",
        processing_fee: (Number(booking.processing_fee) || 0) + feeAmount,
        total_paid: newTotalPaid,
        paid_at: new Date().toISOString(),
        payment_reference: combinedRef,
      })
      .eq("id", bookingId);

    if (updateErr) throw updateErr;

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
