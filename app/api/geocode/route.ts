import { NextRequest, NextResponse } from "next/server";

// Ensure this route is not statically generated
export const dynamic = 'force-dynamic';

const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY || "91f166c584104e339f9fdee05f37eec9";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json(
      { error: "Latitude and longitude are required" },
      { status: 400 }
    );
  }

  try {
    const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&apiKey=${GEOAPIFY_API_KEY}`;
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unable to read error response");
        console.error("[Geocode API] Response error:", response.status, errorText);
        throw new Error(`Geoapify API returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      // Geoapify returns { features: [{ properties: { formatted: "address" } }] }
      let display_name = null;
      if (data.features && data.features.length > 0) {
        display_name = data.features[0].properties?.formatted || null;
      }

      // Return in a compatible format
      return NextResponse.json({
        display_name,
        raw: data, // Include raw response for debugging
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === "AbortError") {
        throw new Error("Request timeout - geocode service took too long to respond");
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error("[Geocode API] Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch address", 
        details: error.message || "Unknown error",
        display_name: null 
      },
      { status: 500 }
    );
  }
}
