import { NEPAL_DISTRICTS } from "@/lib/districts";
import type { Alert, HazardType, Severity, Timeframe } from "@/lib/types";

const VALID_HAZARDS: HazardType[] = ["flood", "earthquake", "landslide", "glof"];
const VALID_SEVERITIES: Severity[] = ["danger", "warning", "watch", "advisory"];
const DATE_WINDOWS_MS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

/** Loosely-typed alerts row as returned by /api/community-reports. */
export type CommunityReportRow = Record<string, any>;

/**
 * Convert a raw community report row to the shared Alert shape, tolerating
 * missing fields. Reports without real coordinates get no lat/lng (rather
 * than a 0,0 pin).
 */
export function communityRowToAlert(r: CommunityReportRow): Alert {
  const canonicalDistrict = r.district || "Nepal";
  const titleEn = r.title_en || `Community Report: ${String(r.hazard || "").toUpperCase()} in ${canonicalDistrict}`;
  const titleNe = r.title_ne || `सामुदायिक रिपोर्ट: ${canonicalDistrict}मा ${r.hazard || "प्रकोप"}`;
  const descEn = r.description_en || r.description || "";
  const descNe = r.description_ne || descEn;

  const numLat = r.lat != null && r.lat !== "" ? Number(r.lat) : null;
  const numLng = r.lng != null && r.lng !== "" ? Number(r.lng) : null;
  const hasCoords =
    numLat !== null &&
    numLng !== null &&
    Number.isFinite(numLat) &&
    Number.isFinite(numLng) &&
    (numLat !== 0 || numLng !== 0);

  const rawHazard = (r.hazard || "flood").toLowerCase();
  const hazard: HazardType = VALID_HAZARDS.includes(rawHazard as HazardType)
    ? (rawHazard as HazardType)
    : "flood";

  const rawSeverity = (r.severity || "advisory").toLowerCase();
  const severity: Severity = VALID_SEVERITIES.includes(rawSeverity as Severity)
    ? (rawSeverity as Severity)
    : "advisory";

  const timeframe: Timeframe = (r.timeframe || "now").toLowerCase() as Timeframe;

  return {
    id: r.id,
    hazard,
    severity,
    timeframe,
    title: { en: titleEn, ne: titleNe },
    description: { en: descEn, ne: descNe },
    issuedAt: r.issued_at || r.created_at || new Date().toISOString(),
    location: {
      lat: hasCoords ? numLat! : undefined,
      lng: hasCoords ? numLng! : undefined,
      name: r.location_name || r.district || "Nepal",
      district: r.district || undefined,
    },
    source: {
      id: r.source_id || "community",
      name: r.source_name || "Community Reports",
      url: r.source_url || "/report",
      status: r.source_status || "recent",
      fetchedAt: r.issued_at || r.created_at || new Date().toISOString(),
    },
    provenance: "community",
    meta: typeof r.meta === "object" && r.meta !== null ? r.meta : {},
  };
}

export interface CommunityReportFilters {
  /** Hazard type or "all". */
  hazard: string;
  /** Severity or "all". */
  severity: string;
  /** "all", "24h", "7d" or "30d". */
  date: string;
  /** Free-text search across titles, descriptions and place names (en + ne). */
  query: string;
}

export function filterCommunityReports(
  reports: Alert[],
  filters: CommunityReportFilters,
  now = Date.now(),
): Alert[] {
  const q = filters.query.trim().toLowerCase();

  return reports.filter((r) => {
    if (filters.hazard !== "all" && r.hazard.toLowerCase() !== filters.hazard.toLowerCase()) {
      return false;
    }
    if (filters.severity !== "all" && r.severity.toLowerCase() !== filters.severity.toLowerCase()) {
      return false;
    }
    if (q) {
      const locDist = r.location?.district?.toLowerCase() || "";
      // Also match the district's Nepali name
      const matchedDist = NEPAL_DISTRICTS.find(
        (d) => d.id.toLowerCase() === locDist || d.en.toLowerCase().includes(locDist),
      );
      const haystack = [
        r.title?.en,
        r.title?.ne,
        r.description?.en,
        r.description?.ne,
        r.location?.name,
        locDist,
        matchedDist?.ne,
      ].map((s) => s?.toLowerCase() || "");

      if (!haystack.some((s) => s.includes(q))) return false;
    }
    const windowMs = DATE_WINDOWS_MS[filters.date];
    if (windowMs !== undefined) {
      const reportDate = new Date(r.issuedAt).getTime();
      if (Number.isNaN(reportDate) || now - reportDate > windowMs) return false;
    }
    return true;
  });
}
