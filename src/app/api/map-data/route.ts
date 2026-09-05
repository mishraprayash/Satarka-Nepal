import { NextResponse } from "next/server";
import { loadMapData } from "@/lib/map-data";

export const revalidate = 300;

export async function GET() {
  const data = await loadMapData();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
    },
  });
}
