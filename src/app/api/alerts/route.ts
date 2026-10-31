import { NextResponse } from "next/server";
import { getAlerts } from "@/lib/alerts-service";

// Recompute at most once a minute; upstream feeds have their own cache windows.
export const revalidate = 60;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fresh = searchParams.get("fresh") === "1" || searchParams.get("fresh") === "true";

  // Reads only: the ingest cron (/api/ingest) is the sole writer to Supabase.
  const { data, origin } = await getAlerts({ fresh });

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": fresh
        ? "no-cache, no-store, max-age=0"
        : "public, s-maxage=60, stale-while-revalidate=300",
      "X-Data-Source": origin === "supabase" ? "supabase" : "upstream-isr",
    },
  });
}
