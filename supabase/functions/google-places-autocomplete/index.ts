import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { input, sessionToken } = await req.json();
    if (!input || input.length < 3) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Places API (New) Autocomplete
    const response = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
        },
        body: JSON.stringify({
          input,
          includedRegionCodes: ["us"],
          includedPrimaryTypes: ["street_address", "subpremise", "premise"],
          sessionToken,
          locationBias: {
            circle: {
              center: { latitude: 39.7285, longitude: -121.8375 }, // Chico, CA
              radius: 80000, // 80km
            },
          },
        }),
      }
    );

    const data = await response.json();

    if (!data.suggestions) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For each suggestion, get place details to extract address components
    const suggestions = await Promise.all(
      data.suggestions
        .filter((s: any) => s.placePrediction)
        .slice(0, 5)
        .map(async (s: any) => {
          const placeId = s.placePrediction.placeId;
          const detailsRes = await fetch(
            `https://places.googleapis.com/v1/places/${placeId}?fields=addressComponents,formattedAddress`,
            {
              headers: {
                "X-Goog-Api-Key": apiKey,
              },
            }
          );
          const details = await detailsRes.json();

          let street = "";
          let city = "";
          let zip = "";
          let streetNumber = "";
          let route = "";

          if (details.addressComponents) {
            for (const comp of details.addressComponents) {
              const types = comp.types || [];
              if (types.includes("street_number")) streetNumber = comp.longText || "";
              if (types.includes("route")) route = comp.longText || "";
              if (types.includes("locality")) city = comp.longText || "";
              if (types.includes("postal_code")) zip = comp.longText || "";
            }
          }

          street = [streetNumber, route].filter(Boolean).join(" ");

          return {
            description: s.placePrediction.text?.text || details.formattedAddress || "",
            street,
            city,
            zip,
          };
        })
    );

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Google Places error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch suggestions" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
