import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ stationId: string }> }
) {
  const { stationId } = await params;
  const supabase = getSupabaseServerClient();
  
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  // Fetch telemetry history for the last 48 hours for the specific station
  const { data, error } = await supabase
    .from("river_telemetry_history")
    .select("water_level, measured_at, warning_level, danger_level")
    .eq("station_id", stationId)
    .order("measured_at", { ascending: true })
    // Limit to prevent massive payloads, assuming measurements every 15-30 mins
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
