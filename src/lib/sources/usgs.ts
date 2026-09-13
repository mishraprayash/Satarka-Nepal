import type { Alert } from "@/lib/types";
import type { SourceContext, SourceDescriptor, SourceLoadResult } from "./base";
import { makeSourceRef } from "./base";
import { fetchJson, magnitudeToSeverity, num, str } from "./util";

/**
 * USGS FDSN event service — the live earthquake feed for the Nepal region.
 * BIPAD's own quake feed is ~1yr stale, so seismic data comes from here.
 * Notes that bit us in testing:
 *   - the Nepal bbox also returns quarry blasts / landslide-tagged events, so
 *     we request AND re-check `type === "earthquake"`.
 *   - `time` is epoch MILLISECONDS, not seconds.
 *   - geometry.coordinates is [lng, lat, depth-km].
 */

import { CONFIG } from "@/lib/config";

const URL =
  `${CONFIG.apis.usgs}${CONFIG.apis.usgs.includes("?") ? "&" : "?"}` +
  "minlatitude=26&maxlatitude=31&minlongitude=80&maxlongitude=89" +
  "&minmagnitude=2.5&eventtype=earthquake&orderby=time&limit=50";

interface UsgsFeature {
  id?: string;
  properties?: {
    mag?: number | null;
    place?: string | null;
    time?: number | null;
    url?: string | null;
    type?: string | null;
  };
  geometry?: { coordinates?: unknown };
}

interface UsgsResponse {
  features?: UsgsFeature[];
}

export function parseUsgsFeature(
  f: UsgsFeature,
  nowMs: number,
  fetchedAt: string,
): Alert | null {
  const p = f.properties ?? {};
  if ((p.type ?? "earthquake") !== "earthquake") return null; // drop blasts/landslides

  const ms = num(p.time);
  if (ms === null) return null;
  const hoursAgo = (nowMs - ms) / 3600_000;
  // Strictly discard tremors older than max threshold from active alerts
  if (hoursAgo > CONFIG.thresholds.earthquakeMaxAgeDays * 24) return null;

  const mag = num(p.mag);
  const coords = f.geometry?.coordinates;
  let lat: number | null = null;
  let lng: number | null = null;
  let depth: number | null = null;
  if (Array.isArray(coords)) {
    lng = num(coords[0]);
    lat = num(coords[1]);
    depth = num(coords[2]);
  }

  const issuedAt = new Date(ms).toISOString();
  const place = str(p.place) ?? "Nepal region";
  const magLabel = mag !== null ? `M ${mag.toFixed(1)}` : "Earthquake";
  // Earthquakes within acute window are "now"; older are after-the-fact "report"
  const timeframe = hoursAgo <= CONFIG.thresholds.earthquakeAcuteHours ? "now" : "report";

  return {
    id: `usgs-${f.id ?? "eq"}`,
    hazard: "earthquake",
    severity: magnitudeToSeverity(mag),
    timeframe,
    title: { en: `${magLabel} — ${place}` },
    location:
      lat !== null && lng !== null ? { lat, lng, name: place } : { name: place },
    issuedAt,
    source: makeSourceRef(usgsSource, fetchedAt),
    provenance: "official",
    meta: {
      magnitude: mag,
      depthKm: depth,
      detailUrl: str(p.url) ?? undefined,
    },
  };
}

async function load(ctx: SourceContext): Promise<SourceLoadResult> {
  // Query earthquakes within the configured sliding window only
  const startTime = new Date(
    Date.now() - CONFIG.thresholds.earthquakeMaxAgeDays * 86400_000,
  ).toISOString();
  const url = `${URL}&starttime=${encodeURIComponent(startTime)}`;

  const data = await fetchJson<UsgsResponse>(url, { revalidate: 120 });
  const features = data.features ?? [];
  const alerts: Alert[] = [];
  const now = Date.parse(ctx.fetchedAt);

  for (const f of features) {
    const alert = parseUsgsFeature(f, now, ctx.fetchedAt);
    if (alert) {
      alerts.push(alert);
    }
  }

  return { alerts, scanned: features.length };
}

export const _internal = {
  parseUsgsFeature,
  URL,
};

export const usgsSource: SourceDescriptor = {
  id: "usgs-eq",
  name: "USGS Earthquake Hazards Program",
  url: "https://earthquake.usgs.gov/earthquakes/map/",
  status: "live",
  timeframe: "now",
  hazards: ["earthquake"],
  load,
};
