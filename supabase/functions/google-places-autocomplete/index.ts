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

const parseOpenStreetMapAddress = (address: Record<string, string> = {}) => {
  const street = [address.house_number, address.road || address.pedestrian || address.footway]
    .filter(Boolean)
    .join(" ")
    .trim();
  const city = address.city || address.town || address.village || address.hamlet || address.county || "";
  const zip = address.postcode || "";

  return { street, city, zip };
};

const fetchPlacesNew = async (apiKey: string, input: string, token: string): Promise<AddressSuggestion[]> => {
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

  if (!autocompleteResponse.ok || !Array.isArray(autocompleteData?.suggestions)) {
    console.error("Places API (New) failed:", autocompleteData);
    return [];
  }

  const placePredictions = autocompleteData.suggestions
    .filter((s: any) => s?.placePrediction?.placeId)
    .slice(0, 5);

  return (
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
};

const fetchPlacesLegacy = async (apiKey: string, input: string, token: string): Promise<AddressSuggestion[]> => {
  const legacyAutocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=address&components=country:us&location=39.7285,-121.8375&radius=80000&sessiontoken=${encodeURIComponent(token)}&key=${encodeURIComponent(apiKey)}`;
  const autocompleteRes = await fetch(legacyAutocompleteUrl);
  const autocompleteData = await autocompleteRes.json();

  if (autocompleteData?.status !== "OK" && autocompleteData?.status !== "ZERO_RESULTS") {
    console.error("Places API (Legacy) failed:", autocompleteData);
    return [];
  }

  const predictions = (autocompleteData?.predictions || []).slice(0, 5);

  return (
    await Promise.all(
      predictions.map(async (prediction: any) => {
        const placeId = prediction?.place_id;
        if (!placeId) return null;

        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=address_component,formatted_address&sessiontoken=${encodeURIComponent(token)}&key=${encodeURIComponent(apiKey)}`;
        const detailsRes = await fetch(detailsUrl);
        const detailsData = await detailsRes.json();

        if (detailsData?.status !== "OK") return null;

        const { street, city, zip } = parseAddressComponents(detailsData?.result?.address_components || []);

        return {
          description: prediction?.description || detailsData?.result?.formatted_address || street,
          street,
          city,
          zip,
        };
      }),
    )
  ).filter((item): item is AddressSuggestion => Boolean(item && item.description));
};

const geocodeFallback = async (apiKey: string, input: string): Promise<AddressSuggestion[]> => {
  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(input)}&components=country:US&key=${encodeURIComponent(apiKey)}`;
  const geocodeRes = await fetch(geocodeUrl);
  const geocodeData = await geocodeRes.json();

  if (geocodeData?.status !== "OK") {
    console.error("Geocoding fallback failed:", geocodeData);
    return [];
  }

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

const openStreetMapFallback = async (input: string): Promise<AddressSuggestion[]> => {
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=us&viewbox=-122.15,40.05,-121.45,39.55&bounded=1&q=${encodeURIComponent(input)}`;

  const res = await fetch(nominatimUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "maid-for-chico-address-autocomplete/1.0",
    },
  });

  if (!res.ok) {
    console.error("OpenStreetMap fallback failed:", await res.text());
    return [];
  }

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data
    .slice(0, 5)
    .map((result: any) => {
      const { street, city, zip } = parseOpenStreetMapAddress(result?.address || {});
      const description = result?.display_name || street || input;

      return {
        description,
        street: street || description,
        city,
        zip,
      };
    })
    .filter((item): item is AddressSuggestion => Boolean(item.description));
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");

    const { input, sessionToken } = await req.json();
    if (!input || input.length < 3) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = typeof sessionToken === "string" && sessionToken.length > 0
      ? sessionToken
      : crypto.randomUUID();

    let suggestions: AddressSuggestion[] = [];

    if (apiKey) {
      suggestions = await fetchPlacesNew(apiKey, input, token);

      if (suggestions.length === 0) {
        suggestions = await fetchPlacesLegacy(apiKey, input, token);
      }

      if (suggestions.length === 0) {
        suggestions = await geocodeFallback(apiKey, input);
      }
    } else {
      console.warn("GOOGLE_PLACES_API_KEY is not configured, using OpenStreetMap fallback only");
    }

    if (suggestions.length === 0) {
      suggestions = await openStreetMapFallback(input);
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
