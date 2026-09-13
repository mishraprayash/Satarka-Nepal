import type { Alert, Severity } from "@/lib/types";
import type { SourceContext, SourceDescriptor, SourceLoadResult } from "./base";
import { makeSourceRef } from "./base";
import { fetchJson, inNepalBbox, num, str } from "./util";

/**
 * GDACS (JRC / UN) — global multi-hazard alert system, used here as a
 * SECONDARY confirmation layer for floods affecting Nepal. Earthquakes are
 * deliberately left to USGS to avoid showing the same quake twice from two
 * agencies; GDACS earthquake events are skipped.
 */
import { CONFIG } from "@/lib/config";

const URL = CONFIG.apis.gdacs;

interface GdacsFeature {
  geometry?: { coordinates?: unknown };
  properties?: Record<string, unknown>;
}
interface GdacsResponse {
  features?: GdacsFeature[];
}

function alertLevelToSeverity(level: string | null): Severity | null {
  switch ((level ?? "").toLowerCase()) {
    case "red":
      return "danger";
    case "orange":
      return "warning";
    case "green":
      return "advisory";
    default:
      return null;
  }
}

function isNepal(props: Record<string, unknown>, lat: number | null, lng: number | null): boolean {
  const iso = (str(props["iso3"]) ?? "").toUpperCase();
  const country = (str(props["country"]) ?? "").toLowerCase();
  if (iso.includes("NPL")) return true;
  if (country.includes("nepal")) return true;
  if (lat !== null && lng !== null) return inNepalBbox(lat, lng);
  return false;
}

export function parseGdacsFeature(
  f: GdacsFeature,
  nowMs: number,
  fetchedAt: string,
): Alert | null {
  const props = f.properties ?? {};
  const eventType = (str(props["eventtype"]) ?? "").toUpperCase();
  if (eventType !== "FL") return null; // floods only; quakes handled by USGS

  const coords = f.geometry?.coordinates;
  const lng = Array.isArray(coords) ? num(coords[0]) : null;
  const lat = Array.isArray(coords) ? num(coords[1]) : null;
  if (!isNepal(props, lat, lng)) return null;

  // Temporal hygiene: discard flood events that have expired or are older than threshold
  const toDateStr = str(props["todate"]);
  const fromDateStr = str(props["fromdate"]);
  if (toDateStr) {
    const toMs = Date.parse(toDateStr);
    if (!Number.isNaN(toMs) && toMs < nowMs) return null;
  } else if (fromDateStr) {
    const fromMs = Date.parse(fromDateStr);
    if (
      !Number.isNaN(fromMs) &&
      (nowMs - fromMs) / 3600_000 > CONFIG.thresholds.earthquakeMaxAgeDays * 24
    ) {
      return null;
    }
  }

  const severity = alertLevelToSeverity(str(props["alertlevel"]));
  if (!severity) return null;

  const name = str(props["name"]) ?? str(props["htmldescription"]) ?? "Flood event";
  const urlObj = props["url"] as { report?: unknown; details?: unknown } | undefined;
  const detailUrl =
    str(urlObj?.report) ?? str(urlObj?.details) ?? "https://www.gdacs.org/";

  return {
    id: `gdacs-${str(props["eventid"]) ?? "fl"}`,
    hazard: "flood",
    severity,
    timeframe: "now",
    title: { en: name },
    location: lat !== null && lng !== null ? { lat, lng } : undefined,
    issuedAt: str(props["fromdate"]) ?? fetchedAt,
    expiresAt: str(props["todate"]) ?? null,
    source: makeSourceRef(gdacsSource, fetchedAt),
    provenance: "official",
    meta: { alertLevel: str(props["alertlevel"]) ?? undefined, detailUrl },
  };
}

async function load(ctx: SourceContext): Promise<SourceLoadResult> {
  const data = await fetchJson<GdacsResponse>(URL, {
    revalidate: 600,
    timeoutMs: CONFIG.timeouts.extendedMs,
  });
  const features = data.features ?? [];
  const alerts: Alert[] = [];
  const nowMs = Date.parse(ctx.fetchedAt);

  for (const f of features) {
    const alert = parseGdacsFeature(f, nowMs, ctx.fetchedAt);
    if (alert) {
      alerts.push(alert);
    }
  }

  return { alerts, scanned: features.length };
}

export const _internal = {
  alertLevelToSeverity,
  isNepal,
  parseGdacsFeature,
};

export const gdacsSource: SourceDescriptor = {
  id: "gdacs",
  name: "GDACS (JRC / United Nations)",
  url: "https://www.gdacs.org/",
  status: "live",
  timeframe: "now",
  hazards: ["flood"],
  note: {
    en: "Global model-based alerts — a secondary cross-check, not a Nepal-specific gauge.",
    ne: "विश्वव्यापी मोडेल-आधारित चेतावनी — दोस्रो पुष्टि मात्र, नेपाल-विशेष मापन होइन।",
  },
  load,
};
