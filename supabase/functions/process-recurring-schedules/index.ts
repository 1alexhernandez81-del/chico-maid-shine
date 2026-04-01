import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Calculate the next service date based on frequency
function advanceDate(currentDate: string, frequency: string): string {
  const d = new Date(currentDate + "T00:00:00");
  // Handle "every-N-weeks" pattern
  const everyNMatch = frequency.match(/^every-(\d+)-weeks$/);
  if (everyNMatch) {
    d.setDate(d.getDate() + parseInt(everyNMatch[1]) * 7);
  } else if (frequency === "weekly") {
    d.setDate(d.getDate() + 7);
  } else if (frequency === "bi-weekly") {
    d.setDate(d.getDate() + 14);
  } else if (frequency === "monthly") {
    d.setMonth(d.getMonth() + 1);
  } else {
    d.setDate(d.getDate() + 7);
  }
  return d.toISOString().split("T")[0];
}

// Get the next occurrence of a preferred day from a given date
function getNextPreferredDay(fromDate: string, preferredDay: string | null): string {
  if (!preferredDay) return fromDate;
  const dayMap: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  const targetDay = dayMap[preferredDay.toLowerCase()];
  if (targetDay === undefined) return fromDate;

  const d = new Date(fromDate + "T00:00:00");
  const currentDay = d.getDay();
  let daysUntil = targetDay - currentDay;
  if (daysUntil <= 0) daysUntil += 7;
  d.setDate(d.getDate() + daysUntil);
  return d.toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split("T")[0];

    // Get all active schedules where next_service_date <= today
    const { data: schedules, error: fetchErr } = await supabase
      .from("recurring_schedules")
      .select("*, customers(name, email, phone)")
      .eq("active", true)
      .lte("next_service_date", today);

    if (fetchErr) {
      console.error("Fetch schedules error:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!schedules || schedules.length === 0) {
      console.log("No recurring schedules due today.");
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let errors = 0;

    for (const schedule of schedules) {
      try {
        const customer = schedule.customers as any;
        if (!customer) {
          console.error(`Schedule ${schedule.id}: customer not found`);
          errors++;
          continue;
        }

        // Create a booking for this service
        const { error: insertErr } = await supabase.from("bookings").insert({
          customer_id: schedule.customer_id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          street: schedule.street,
          city: schedule.city,
          zip: schedule.zip,
          service_type: schedule.service_type,
          frequency: schedule.frequency,
          preferred_date: schedule.next_service_date,
          preferred_time: schedule.preferred_time || null,
          scheduled_date: schedule.next_service_date,
          scheduled_time: schedule.preferred_time || "09:00",
          status: "approved",
          total_price: schedule.price || null,
          deposit_override: 0,
          notes: schedule.notes
            ? `[Auto-generated from recurring schedule]\n${schedule.notes}`
            : "[Auto-generated from recurring schedule]",
          sqft: schedule.sqft || null,
          bedrooms: schedule.bedrooms || null,
          bathrooms: schedule.bathrooms || null,
        });

        if (insertErr) {
          console.error(`Schedule ${schedule.id}: booking insert error:`, insertErr);
          errors++;
          continue;
        }

        // Advance next_service_date
        const nextDate = advanceDate(schedule.next_service_date, schedule.frequency);

        const { error: updateErr } = await supabase
          .from("recurring_schedules")
          .update({ next_service_date: nextDate })
          .eq("id", schedule.id);

        if (updateErr) {
          console.error(`Schedule ${schedule.id}: update next_service_date error:`, updateErr);
        }

        processed++;
        console.log(`Schedule ${schedule.id}: booking created for ${schedule.next_service_date}, next: ${nextDate}`);
      } catch (err) {
        console.error(`Schedule ${schedule.id}: unexpected error:`, err);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ processed, errors, total: schedules.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("process-recurring-schedules error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
