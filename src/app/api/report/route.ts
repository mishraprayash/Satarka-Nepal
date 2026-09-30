import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { NEPAL_DISTRICTS } from "@/lib/districts";
import { z } from "zod";

function sanitizeString(str: string): string {
  return str
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

const optionalCoordSchema = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((val, ctx) => {
    if (val === null || val === undefined) return null;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (!trimmed) return null;
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Coordinate must be a valid number",
        });
        return z.NEVER;
      }
      return parsed;
    }
    if (!Number.isFinite(val) || Number.isNaN(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Coordinate must be a valid finite number",
      });
      return z.NEVER;
    }
    return val;
  });

const ReportSchema = z
  .object({
    hazard: z.enum(["flood", "earthquake", "landslide", "glof"] as const),
    district: z
      .string({ message: "District is required" })
      .transform(sanitizeString)
      .pipe(
        z
          .string()
          .min(2, "District must be at least 2 characters")
          .max(100, "District must not exceed 100 characters")
      ),
    address: z
      .string({ message: "Address is required" })
      .transform((v) => sanitizeString(v).replace(/\s+/g, " "))
      .pipe(
        z
          .string()
          .min(2, "Address or specific location is required (min 2 characters)")
          .max(200, "Address must not exceed 200 characters")
      ),
    description: z
      .string({ message: "Description is required" })
      .transform((v) => sanitizeString(v).replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n"))
      .pipe(
        z
          .string()
          .min(4, "Description must be at least 4 characters")
          .max(1000, "Description must not exceed 1000 characters")
      ),
    lat: optionalCoordSchema,
    lng: optionalCoordSchema,
  })
  .refine(
    (data) => {
      const hasLat = data.lat !== null && data.lat !== undefined;
      const hasLng = data.lng !== null && data.lng !== undefined;
      return (hasLat && hasLng) || (!hasLat && !hasLng);
    },
    {
      message: "Both latitude and longitude must be provided together, or both left empty",
      path: ["lat"],
    }
  )
  .refine(
    (data) => {
      if (data.lat == null) return true;
      return data.lat >= -90 && data.lat <= 90;
    },
    {
      message: "Latitude must be between -90 and 90 degrees",
      path: ["lat"],
    }
  )
  .refine(
    (data) => {
      if (data.lng == null) return true;
      return data.lng >= -180 && data.lng <= 180;
    },
    {
      message: "Longitude must be between -180 and 180 degrees",
      path: ["lng"],
    }
  );

const HAZARD_NE: Record<string, string> = {
  flood: "बाढी",
  earthquake: "भूकम्प",
  landslide: "पहिरो",
  glof: "ग्लोफ",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = ReportSchema.parse(body);
    const supabase = getSupabaseServerClient();
    
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Match district case-insensitively or via Nepali name
    const districtQuery = data.district.trim().toLowerCase();
    const matchedDistrict = NEPAL_DISTRICTS.find((d) => {
      const cleanEn = d.en.replace(/\s*\(.*?\)/, "").trim().toLowerCase();
      return (
        d.id.toLowerCase() === districtQuery ||
        d.en.toLowerCase() === districtQuery ||
        cleanEn === districtQuery ||
        d.ne.trim() === data.district.trim()
      );
    });

    const canonicalDistrictEn = matchedDistrict
      ? matchedDistrict.en.replace(/\s*\(.*?\)/, "").trim()
      : data.district.trim();
    const canonicalDistrictNe = matchedDistrict
      ? matchedDistrict.ne.replace(/\s*\(.*?\)/, "").trim()
      : data.district.trim();

    const reportId = `com-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const hasCoords =
      typeof data.lat === "number" &&
      typeof data.lng === "number" &&
      Number.isFinite(data.lat) &&
      Number.isFinite(data.lng);
    
    // Community reports default to a 72-hour active lifecycle
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + 72 * 60 * 60 * 1000);

    const hazardNe = HAZARD_NE[data.hazard] || data.hazard;

    const { error } = await supabase.from("alerts").insert({
      id: reportId,
      hazard: data.hazard,
      severity: "advisory", // Default severity for unverified community reports
      severity_rank: 1,
      timeframe: "now",
      title_en: `Community Report: ${data.hazard.toUpperCase()} in ${canonicalDistrictEn}`,
      title_ne: `सामुदायिक रिपोर्ट: ${canonicalDistrictNe}मा ${hazardNe}`,
      description_en: `${data.description} (Location: ${data.address}, ${canonicalDistrictEn})`,
      description_ne: `${data.description} (स्थान: ${data.address}, ${canonicalDistrictNe})`,
      location_name: data.address,
      basin: null,
      expires_at: expiresAt.toISOString(),
      district: canonicalDistrictEn,
      lat: hasCoords ? data.lat : null,
      lng: hasCoords ? data.lng : null,
      geom: hasCoords ? `SRID=4326;POINT(${data.lng} ${data.lat})` : null,
      issued_at: issuedAt.toISOString(),
      source_id: "community",
      source_name: "Community Reports",
      source_url: "https://satarka.nepal/report",
      source_status: "recent",
      provenance: "community",
      is_active: true,
      meta: {
        unverified: true,
        address: data.address,
        district_ne: canonicalDistrictNe,
      }
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

    const trimmedId = typeof id === "string" ? id.trim() : "";
    if (!trimmedId) {
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
      .eq("id", trimmedId)
      .eq("provenance", "community")
      .select("id");

    if (error) {
      console.error("[community-report] delete error", error);
      return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Community report not found or already deleted" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: trimmedId });
  } catch (error) {
    console.error("[community-report] delete exception", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
