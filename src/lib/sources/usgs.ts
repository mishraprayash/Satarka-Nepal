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

const URL =
  "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson" +
  "&minlatitude=26&maxlatitude=31&minlongitude=80&maxlongitude=89" +
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

async function load(ctx: SourceContext): Promise<SourceLoadResult> {
  const data = await fetchJson<UsgsResponse>(URL, { revalidate: 120 });
  const features = data.features ?? [];
  const alerts: Alert[] = [];

  for (const f of features) {
    const p = f.properties ?? {};
    if ((p.type ?? "earthquake") !== "earthquake") continue; // drop blasts/landslides

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

    const ms = num(p.time);
    const issuedAt = ms !== null ? new Date(ms).toISOString() : ctx.fetchedAt;
    const place = str(p.place) ?? "Nepal region";
    const magLabel = mag !== null ? `M ${mag.toFixed(1)}` : "Earthquake";

    alerts.push({
      id: `usgs-${f.id ?? alerts.length}`,
      hazard: "earthquake",
      severity: magnitudeToSeverity(mag),
      timeframe: "now",
      title: { en: `${magLabel} — ${place}` },
      location:
        lat !== null && lng !== null ? { lat, lng, name: place } : { name: place },
      issuedAt,
      source: makeSourceRef(usgsSource, ctx.fetchedAt),
      provenance: "official",
      meta: {
        magnitude: mag,
        depthKm: depth,
        detailUrl: str(p.url) ?? undefined,
      },
    });
  }

  return { alerts, scanned: features.length };
}

export const usgsSource: SourceDescriptor = {
  id: "usgs-eq",
  name: "USGS Earthquake Hazards Program",
  url: "https://earthquake.usgs.gov/earthquakes/map/",
  status: "live",
  timeframe: "now",
  hazards: ["earthquake"],
  load,
};
