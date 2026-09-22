import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const ReportSchema = z.object({
  hazard: z.enum(["flood", "earthquake", "landslide", "glof"]),
  description: z.string().min(4, "Description must be at least 4 characters").max(1000),
  district: z.string().min(1, "District is required"),
  address: z.string().min(1, "Address or specific location is required"),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = ReportSchema.parse(body);
    const supabase = getSupabaseServerClient();
    
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const reportId = `com-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const hasCoords = typeof data.lat === "number" && typeof data.lng === "number" && !isNaN(data.lat) && !isNaN(data.lng);
    
    // Community reports default to a 72-hour active lifecycle
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + 72 * 60 * 60 * 1000);

    const { error } = await supabase.from("alerts").insert({
      id: reportId,
      hazard: data.hazard,
      severity: "advisory", // Default severity for unverified community reports
      severity_rank: 1,
      timeframe: "now",
      title_en: `Community Report: ${data.hazard.toUpperCase()} in ${data.district}`,
      title_ne: `सामुदायिक रिपोर्ट: ${data.district}मा ${data.hazard}`,
      description_en: `${data.description} (Location: ${data.address}, ${data.district})`,
      description_ne: null,
      location_name: data.address,
      basin: null,
      expires_at: expiresAt.toISOString(),
      district: data.district,
      lat: (hasCoords && data.lat != null) ? data.lat : null,
      lng: (hasCoords && data.lng != null) ? data.lng : null,
      geom: (hasCoords && data.lat != null && data.lng != null) ? `SRID=4326;POINT(${data.lng} ${data.lat})` : null,
      issued_at: issuedAt.toISOString(),
      source_id: "community",
      source_name: "Community Reports",
      source_url: "https://satarka.nepal/report",
      source_status: "recent",
      provenance: "community",
      is_active: true,
      meta: { unverified: true, address: data.address }
    });

    if (error) {
      console.error("[community-report] db error", error);
      return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: reportId, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET;

    // In production, require admin secret to delete reports
    if (process.env.NODE_ENV === "production" && !adminSecret) {
      return NextResponse.json(
        { error: "ADMIN_SECRET or CRON_SECRET must be configured in production" },
        { status: 503 }
      );
    }

    if (adminSecret) {
      const authHeader = req.headers.get("authorization") ?? "";
      const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      const customKey = req.headers.get("x-admin-key") ?? "";
      const { searchParams } = new URL(req.url);
      const querySecret = searchParams.get("secret") ?? "";

      const matches =
        (bearer && bearer === adminSecret) ||
        (customKey && customKey === adminSecret) ||
        (querySecret && querySecret === adminSecret);

      if (!matches) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {
        // Body was empty or not JSON
      }
    }

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Strictly ensure only community provenance records can be deleted via this endpoint
    const { data, error } = await supabase
      .from("alerts")
      .delete()
      .eq("id", id)
      .eq("provenance", "community")
      .select("id");

    if (error) {
      console.error("[community-report] delete error", error);
      return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Community report not found or already deleted" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("[community-report] delete exception", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
