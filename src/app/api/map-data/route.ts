import { NextResponse } from "next/server";
import { loadMapData, mapDataToGeoJson } from "@/lib/map-data";

export const revalidate = 120;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fresh = searchParams.get("fresh") === "1" || searchParams.get("fresh") === "true";
    const format = searchParams.get("format")?.toLowerCase().trim();
    const layer = searchParams.get("layer") ?? searchParams.get("hazard") ?? undefined;

    const data = await loadMapData(fresh);

    const cacheHeader = fresh
      ? "no-cache, no-store, max-age=0"
      : "public, s-maxage=120, stale-while-revalidate=300";

    if (format === "geojson") {
      const geojson = mapDataToGeoJson(data, layer);
      return NextResponse.json(geojson, {
        headers: {
          "Cache-Control": cacheHeader,
          "Content-Type": "application/geo+json; charset=utf-8",
        },
      });
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": cacheHeader,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
