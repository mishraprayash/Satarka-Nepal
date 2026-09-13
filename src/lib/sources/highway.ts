import type { Alert, HighwayBlockage, HighwayStatus, Severity } from "@/lib/types";
import type { SourceContext, SourceDescriptor, SourceLoadResult } from "./base";
import { makeSourceRef } from "./base";
import { extractLatLng, fetchJson, num, str } from "./util";
import { CONFIG } from "@/lib/config";

const BASE = CONFIG.apis.bipad;

interface Drf<T> {
  results?: T[];
}

type Row = Record<string, unknown>;

function parseHighwayStatus(s: string | null): HighwayStatus {
  const upper = (s ?? "").toUpperCase();
  if (upper.includes("BLOCK") || upper.includes("CLOSE")) return "BLOCKED";
  if (upper.includes("PARTIAL") || upper.includes("ONE_WAY") || upper.includes("ONE WAY")) return "PARTIAL_OPEN";
  return "OPEN";
}

function parseImages(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val.map((v) => String(v)).filter((url) => url.startsWith("http"));
  }
  return [];
}

/**
 * Loads raw highway rows from BIPAD and normalizes them into structured HighwayBlockage items.
 */
export async function loadHighways(): Promise<HighwayBlockage[]> {
  try {
    const data = await fetchJson<Drf<Row>>(`${BASE}/highway/?limit=100&ordering=-modifiedOn`, {
      revalidate: 180,
    });
    const rows = data.results ?? [];
    const items: HighwayBlockage[] = [];

    for (const row of rows) {
      const id = `dor-hw-${str(row["id"]) ?? items.length}`;
      const title = str(row["title"]) ?? "National Highway";
      const roadRefno = str(row["roadRefno"]) ?? "Highway";
      const location = str(row["location"]) ?? "";
      const rawStatus = str(row["status"]);
      const status = parseHighwayStatus(rawStatus);
      const closureReason = str(row["closureReason"]) ?? "Landslide";
      const repairEta = str(row["repairEta"]) ?? undefined;
      const effortsBeingMade = str(row["effortsBeingMade"]) ?? undefined;
      const remarks = str(row["remarks"]) ?? undefined;
      const contactPerson = str(row["contactPerson"]) ?? undefined;
      const chainage = str(row["chainage"]) ?? undefined;
      const startedAt = str(row["dateRoadblockStart"]) ?? undefined;
      const estimatedEndAt = str(row["dateRoadblockEndEstimated"]) ?? undefined;
      const endedAt = str(row["dateRoadblockEnd"]) ?? undefined;
      const actualRepairTime = str(row["actualRepairTime"]) ?? undefined;

      const loc = extractLatLng(row);
      const images = parseImages(row["images"]);

      const affDemo = row["affectedDemography"] as Row | undefined;
      const affectedDemography = affDemo
        ? {
            maleCount: num(affDemo["maleCount"]) ?? undefined,
            femaleCount: num(affDemo["femaleCount"]) ?? undefined,
            householdCount: num(affDemo["householdCount"]) ?? undefined,
          }
        : undefined;

      items.push({
        id,
        roadDataId: num(row["roadDataId"]) ?? undefined,
        title,
        roadRefno,
        linkCode: str(row["linkCode"]) ?? undefined,
        location,
        status,
        closureReason,
        repairEta,
        effortsBeingMade,
        remarks,
        contactPerson,
        lat: loc?.lat,
        lng: loc?.lng,
        chainage,
        startedAt,
        estimatedEndAt,
        endedAt,
        actualRepairTime,
        affectedDemography,
        images,
      });
    }

    return items;
  } catch (err) {
    console.error("[highway] failed to load highway data:", err);
    return [];
  }
}

/**
 * Maps active highway blockages (BLOCKED or PARTIAL_OPEN) into Satarka's unified Alert schema.
 */
async function loadAlerts(ctx: SourceContext): Promise<SourceLoadResult> {
  const highways = await loadHighways();
  const alerts: Alert[] = [];
  const now = Date.parse(ctx.fetchedAt);

  for (const h of highways) {
    // If the blockage is explicitly marked as ended in the past, do not surface as active alert
    if (h.endedAt) {
      const endMs = Date.parse(h.endedAt);
      if (!Number.isNaN(endMs) && now - endMs > 24 * 3600_000) continue;
    }

    // Only surface active disruptions (BLOCKED / PARTIAL_OPEN) or those very recently cleared (within last 12h)
    if (h.status === "OPEN") {
      if (!h.endedAt) continue;
      const endMs = Date.parse(h.endedAt);
      if (Number.isNaN(endMs) || now - endMs > 12 * 3600_000) continue;
    }

    // Parse and normalize roadblock start timestamp
    let startMs = h.startedAt ? Date.parse(h.startedAt) : null;
    if (startMs !== null) {
      const yr = new Date(startMs).getFullYear();
      // Handle Bikram Sambat year entered by government operator (e.g. BS 2083)
      if (yr >= 2075 && yr <= 2100) {
        startMs = startMs - Math.round(56.7 * 365.25 * 86400_000);
      } else if (yr < 2020 || Number.isNaN(startMs)) {
        startMs = now;
      }
    }

    const daysAgo = startMs ? (now - startMs) / 86400_000 : 0;
    // Discard historical roadblock records older than configured threshold
    if (daysAgo > CONFIG.thresholds.highwayMaxAgeDays) continue;

    const severity: Severity = h.status === "BLOCKED" ? "danger" : "warning";
    const statusLabel =
      h.status === "BLOCKED"
        ? "Blocked"
        : h.status === "PARTIAL_OPEN"
          ? "One-way / Partial Open"
          : "Recently Cleared";

    const titleEn = `${h.roadRefno}: ${h.closureReason} at ${h.location || h.title}`;
    const descEn = [
      `Status: ${statusLabel}.`,
      daysAgo > 2 ? `Ongoing disruption (Day ${Math.max(1, Math.round(daysAgo))}).` : null,
      h.repairEta ? `Estimated clearance: ${h.repairEta}.` : null,
      h.effortsBeingMade ? `Efforts: ${h.effortsBeingMade}.` : null,
      h.remarks ? `Notes: ${h.remarks}.` : null,
      h.contactPerson ? `Contact: ${h.contactPerson}.` : null,
    ]
      .filter(Boolean)
      .join(" ");

    // Acute closures are "now"; ongoing multi-day disruptions are after-the-fact reports ("report")
    const timeframe =
      daysAgo * 24 <= CONFIG.thresholds.highwayAcuteHours ? "now" : "report";

    alerts.push({
      id: `highway-${h.id}`,
      hazard: "landslide",
      severity,
      timeframe,
      title: { en: titleEn },
      description: { en: descEn },
      location:
        h.lat != null && h.lng != null
          ? {
              lat: h.lat,
              lng: h.lng,
              name: h.location || h.title,
            }
          : { name: h.location || h.title },
      issuedAt: startMs ? new Date(startMs).toISOString() : ctx.fetchedAt,
      expiresAt: h.estimatedEndAt ?? null,
      source: makeSourceRef(highwaySource, ctx.fetchedAt),
      provenance: "official",
      meta: {
        roadRefno: h.roadRefno,
        highwayStatus: h.status,
        closureReason: h.closureReason,
        repairEta: h.repairEta,
        effortsBeingMade: h.effortsBeingMade,
        remarks: h.remarks,
        contactPerson: h.contactPerson,
        affectedDemography: h.affectedDemography,
        images: h.images,
      },
    });
  }

  return { alerts, scanned: highways.length };
}

export const highwaySource: SourceDescriptor = {
  id: "dor-highway",
  name: "Department of Roads (DOR) Highway Monitoring",
  url: "https://bipadportal.gov.np/highway",
  status: "live",
  timeframe: "now",
  hazards: ["landslide"],
  note: {
    en: "Live highway closures, rockfall and landslide blockades from Department of Roads.",
    ne: "सडक विभागबाट प्रत्यक्ष राष्ट्रिय राजमार्ग बन्द, पहिरो तथा अवरोध विवरण।",
  },
  load: loadAlerts,
};

export const _internal = { parseHighwayStatus, parseImages };

