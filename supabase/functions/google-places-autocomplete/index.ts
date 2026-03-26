import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

type AddressSuggestion = {
  description: string;
  street: string;
  city: string;
  zip: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const parseAddressComponents = (components: any[] = []) => {
  let streetNumber = "";
  let route = "";
  let city = "";
  let zip = "";

  for (const comp of components) {
    const types = comp?.types || [];
    const value = comp?.longText || comp?.long_name || "";

    if (types.includes("street_number")) streetNumber = value;
    if (types.includes("route")) route = value;
    if (!city && (types.includes("locality") || types.includes("postal_town") || types.includes("administrative_area_level_3"))) city = value;
    if (types.includes("postal_code")) zip = value;
  }

  return {
    street: [streetNumber, route].filter(Boolean).join(" "),
    city,
    zip,
  };
};

const geocodeFallback = async (apiKey: string, input: string): Promise<AddressSuggestion[]> => {
  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(input)}&components=country:US&key=${encodeURIComponent(apiKey)}`;
  const geocodeRes = await fetch(geocodeUrl);
  const geocodeData = await geocodeRes.json();

  if (!geocodeRes.ok || geocodeData?.status !== "OK") return [];

  return (geocodeData.results || []).slice(0, 5).map((result: any) => {
    const { street, city, zip } = parseAddressComponents(result.address_components || []);
    return {
      description: result.formatted_address || street,
      street,
      city,
      zip,
    };
  });
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GOOGLE_PLACES_API_KEY is not configured" }), {
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

    const token = typeof sessionToken === "string" && sessionToken.length > 0
      ? sessionToken
      : crypto.randomUUID();

    const autocompleteResponse = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text",
      },
      body: JSON.stringify({
        input,
        includedRegionCodes: ["us"],
        sessionToken: token,
        locationBias: {
          circle: {
            center: { latitude: 39.7285, longitude: -121.8375 },
            radius: 80000,
          },
        },
      }),
    });

    const autocompleteData = await autocompleteResponse.json();

    let suggestions: AddressSuggestion[] = [];

    if (autocompleteResponse.ok && Array.isArray(autocompleteData?.suggestions)) {
      const placePredictions = autocompleteData.suggestions
        .filter((s: any) => s?.placePrediction?.placeId)
        .slice(0, 5);

      suggestions = (
        await Promise.all(
          placePredictions.map(async (s: any) => {
            const placeId = s.placePrediction.placeId;
            const detailsRes = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
              headers: {
                "X-Goog-Api-Key": apiKey,
                "X-Goog-FieldMask": "addressComponents,formattedAddress",
              },
            });

            if (!detailsRes.ok) return null;

            const details = await detailsRes.json();
            const { street, city, zip } = parseAddressComponents(details?.addressComponents || []);

            return {
              description: s.placePrediction.text?.text || details?.formattedAddress || street,
              street,
              city,
              zip,
            };
          }),
        )
      ).filter((item): item is AddressSuggestion => Boolean(item && item.description));
    } else {
      console.error("Places autocomplete failed:", autocompleteData);
    }

    if (suggestions.length === 0) {
      suggestions = await geocodeFallback(apiKey, input);
    }

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
