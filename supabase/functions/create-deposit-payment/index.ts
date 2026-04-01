import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CC_FEE_PERCENT = 0.03; // 3% credit card processing fee

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId } = await req.json();

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (fetchErr || !booking) throw new Error("Booking not found");

    // Calculate deposit amount
    const rawItems: Array<{ description: string; amount: number }> = Array.isArray(booking.line_items) ? booking.line_items : [];
    const serviceItems = rawItems.filter((i) => !(i.description || "").toLowerCase().includes("deposit"));
    const subtotal = serviceItems.reduce((sum, i) => sum + Number(i.amount || 0), 0);
    const depositAmt = (booking.deposit_override !== null && booking.deposit_override !== undefined)
      ? Number(booking.deposit_override)
      : (subtotal > 0 ? subtotal * 0.25 : 0);

    if (depositAmt <= 0) throw new Error("No deposit amount to collect");

    // CC: 3% fee on deposit
    const feeRounded = Math.round(depositAmt * CC_FEE_PERCENT * 100) / 100;
    const totalWithFee = depositAmt + feeRounded;
    const totalCents = Math.round(totalWithFee * 100);

    const customerName = (booking.name || "Customer").trim();

    const successParams = new URLSearchParams({
      payment: "success",
      booking_id: bookingId,
      method: "credit_card",
      amount: totalWithFee.toFixed(2),
      fee: feeRounded.toFixed(2),
      balance: depositAmt.toFixed(2),
      type: "deposit",
    });
    const successUrl = `https://maidforchico.com/?${successParams.toString()}`;

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", successUrl);
    params.append("cancel_url", "https://maidforchico.com/?payment=cancelled");
    params.append("customer_email", booking.email);
    params.append("payment_method_types[0]", "card");
    params.append("line_items[0][price_data][currency]", "usd");
    params.append("line_items[0][price_data][product_data][name]", `Deposit — ${customerName}`);
    params.append("line_items[0][price_data][product_data][description]", `25% Deposit for Cleaning Service + CC fee (3%)`);
    params.append("line_items[0][price_data][unit_amount]", String(totalCents));
    params.append("line_items[0][quantity]", "1");
    params.append("metadata[booking_id]", bookingId);
    params.append("metadata[deposit_amount]", depositAmt.toFixed(2));
    params.append("metadata[fee]", feeRounded.toFixed(2));
    params.append("metadata[payment_method]", "card");
    params.append("metadata[payment_type]", "deposit");

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();
    if (!stripeRes.ok) {
      throw new Error(session.error?.message || "Stripe API error");
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: session.url,
        depositAmount: depositAmt.toFixed(2),
        fee: feeRounded.toFixed(2),
        totalWithFee: totalWithFee.toFixed(2),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("create-deposit-payment error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
