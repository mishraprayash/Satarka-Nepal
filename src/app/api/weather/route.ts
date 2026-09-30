import { NextRequest, NextResponse } from "next/server";
import { getCoordinatesWeather } from "@/lib/sources/open-meteo";
import { NEPAL_DISTRICTS } from "@/lib/districts";

export const dynamic = "force-dynamic";
export const revalidate = 900; // 15 minutes

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const district = searchParams.get("district")?.trim();
    const latStr = searchParams.get("lat")?.trim();
    const lngStr = searchParams.get("lng")?.trim();

    if (district) {
      if (district.length > 64) {
        return NextResponse.json(
          { error: "District parameter too long" },
          { status: 400 },
        );
      }

      const d = NEPAL_DISTRICTS.find(
        (item) => item.id.toLowerCase() === district.toLowerCase(),
      );

      if (!d) {
        return NextResponse.json(
          {
            error: `District '${district}' not found. Must be one of the 77 districts of Nepal.`,
          },
          { status: 404 },
        );
      }

      const weather = await getCoordinatesWeather(d.lat, d.lng, d.id);
      if (!weather) {
        return NextResponse.json(
          {
            error: `Weather data temporarily unavailable for district '${d.en}'`,
          },
          { status: 502 },
        );
      }

      return NextResponse.json(weather, {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
        },
      });
    }

    if (latStr !== undefined && latStr !== null || lngStr !== undefined && lngStr !== null) {
      if (!latStr || !lngStr) {
        return NextResponse.json(
          { error: "Both 'lat' and 'lng' query parameters are required" },
          { status: 400 },
        );
      }

      const lat = Number(latStr);
      const lng = Number(lngStr);

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid coordinates (lat must be between -90 and 90, lng between -180 and 180)",
          },
          { status: 400 },
        );
      }

      const weather = await getCoordinatesWeather(lat, lng);
      if (!weather) {
        return NextResponse.json(
          { error: `Weather data temporarily unavailable for coordinates (${lat}, ${lng})` },
          { status: 502 },
        );
      }

      return NextResponse.json(weather, {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
        },
      });
    }

    return NextResponse.json(
      { error: "Missing district or lat/lng query parameters" },
      { status: 400 },
    );
  } catch (err) {
    console.error("[api/weather] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error while processing weather request" },
      { status: 500 },
    );
  }
}
