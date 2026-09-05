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

const URL = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/EVENTS4APP";

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

async function load(ctx: SourceContext): Promise<SourceLoadResult> {
  const data = await fetchJson<GdacsResponse>(URL, { revalidate: 600, timeoutMs: 15000 });
  const features = data.features ?? [];
  const alerts: Alert[] = [];

  for (const f of features) {
    const props = f.properties ?? {};
    const eventType = (str(props["eventtype"]) ?? "").toUpperCase();
    if (eventType !== "FL") continue; // floods only; quakes handled by USGS

    const coords = f.geometry?.coordinates;
    const lng = Array.isArray(coords) ? num(coords[0]) : null;
    const lat = Array.isArray(coords) ? num(coords[1]) : null;
    if (!isNepal(props, lat, lng)) continue;

    const severity = alertLevelToSeverity(str(props["alertlevel"]));
    if (!severity) continue;

    const name = str(props["name"]) ?? str(props["htmldescription"]) ?? "Flood event";
    const urlObj = props["url"] as { report?: unknown; details?: unknown } | undefined;
    const detailUrl =
      str(urlObj?.report) ?? str(urlObj?.details) ?? "https://www.gdacs.org/";

    alerts.push({
      id: `gdacs-${str(props["eventid"]) ?? alerts.length}`,
      hazard: "flood",
      severity,
      timeframe: "now",
      title: { en: name },
      location: lat !== null && lng !== null ? { lat, lng } : undefined,
      issuedAt: str(props["fromdate"]) ?? ctx.fetchedAt,
      expiresAt: str(props["todate"]) ?? null,
      source: makeSourceRef(gdacsSource, ctx.fetchedAt),
      provenance: "official",
      meta: { alertLevel: str(props["alertlevel"]) ?? undefined, detailUrl },
    });
  }

  return { alerts, scanned: features.length };
}

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
