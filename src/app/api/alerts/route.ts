import { NextResponse } from "next/server";
import { loadAllAlerts } from "@/lib/sources";

// Recompute at most once a minute; upstream feeds have their own cache windows.
export const revalidate = 60;

export async function GET() {
  const data = await loadAllAlerts();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
