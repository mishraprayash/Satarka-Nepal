import { NextRequest, NextResponse } from "next/server";
import { getCoordinatesWeather, getDistrictWeather } from "@/lib/sources/open-meteo";
import { CONFIG } from "@/lib/config";

export const revalidate = 900; // 15 minutes

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const district = searchParams.get("district")?.trim();
  const latStr = searchParams.get("lat")?.trim();
  const lngStr = searchParams.get("lng")?.trim();

  if (district) {
    if (district.length > 64) {
      return NextResponse.json({ error: "District parameter too long" }, { status: 400 });
    }
    const weather = await getDistrictWeather(district);
    if (!weather) {
      return NextResponse.json({ error: "District not found or weather unavailable" }, { status: 404 });
    }
    return NextResponse.json(weather, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
      },
    });
  }

  if (latStr && lngStr) {
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
      return NextResponse.json({ error: "Invalid coordinates (lat must be between -90 and 90, lng between -180 and 180)" }, { status: 400 });
    }
    const weather = await getCoordinatesWeather(lat, lng);
    if (!weather) {
      return NextResponse.json({ error: "Weather unavailable for coordinates" }, { status: 502 });
    }
    return NextResponse.json(weather, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
      },
    });
  }

  return NextResponse.json({ error: "Missing district or lat/lng query parameters" }, { status: 400 });
}
