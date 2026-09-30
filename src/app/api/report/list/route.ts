import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const includeAll = searchParams.get("all") === "true";
    const hazard = searchParams.get("hazard");
    const district = searchParams.get("district");
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "100", 10)), 500);

    let query = supabase
      .from("alerts")
      .select("*")
      .eq("provenance", "community")
      .order("issued_at", { ascending: false })
      .limit(limit);

    if (!includeAll) {
      query = query.eq("is_active", true);
    }

    if (hazard && hazard !== "all") {
      query = query.eq("hazard", hazard.toLowerCase() as any);
    }

    if (district && district !== "all") {
      query = query.ilike("district", `%${district}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[community-report-list] fetch error:", error);
      throw error;
    }

    return NextResponse.json({ reports: data || [] });
  } catch (error) {
    console.error("[community-report-list] server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
