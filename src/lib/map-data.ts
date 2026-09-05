/**
 * Everything the hazard map needs, in one honest envelope:
 *   - static REFERENCE layers (basins, glacial lakes, seismic context)
 *   - LIVE layers (DHM river gauges via BIPAD, USGS earthquakes)
 *
 * The live layers are loaded independently and reported separately so one
 * failing feed degrades the map without breaking it — and the UI can say
 * which layer is stale, instead of pretending it is current.
 */
import { fetchJson, num, nowIso, riverLevelToSeverity, statusStringToSeverity, str } from "@/lib/sources/util";
import { BASINS, type Basin } from "./map-data/basins";
import { GLACIAL_LAKES, type GlacialLake } from "./map-data/glacial-lakes";
import { SEISMIC, type SeismicFeature } from "./map-data/seismic";

const BIPAD_RIVER_URL = "https://bipadportal.gov.np/api/v1/river/?limit=200&ordering=-id";
const USGS_URL =
  "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson" +
  "&minlatitude=26&maxlatitude=31&minlongitude=80&maxlongitude=89" +
  "&minmagnitude=2.5&eventtype=earthquake&orderby=time&limit=50";

export type { Basin, BasinRisk } from "./map-data/basins";
export type { GlacialLake } from "./map-data/glacial-lakes";
export type { SeismicFeature } from "./map-data/seismic";

export interface RiverGauge {
  id: string;
  station: string;
  basin?: string;
  lat?: number;
  lng?: number;
  waterLevel?: number;
  warningLevel?: number;
  dangerLevel?: number;
  status?: string;
  trend?: string;
  issuedAt?: string;
  atDanger: boolean;
  atWarning: boolean;
}

export interface Quake {
  id: string;
  mag?: number;
  place: string;
  lat?: number;
  lng?: number;
  depthKm?: number;
  issuedAt?: string;
  url?: string;
}

export interface MapDataResponse {
  generatedAt: string;
  basins: Basin[];
  glacialLakes: GlacialLake[];
  seismic: SeismicFeature[];
  rivers: RiverGauge[];
  quakes: Quake[];
  riverOk: boolean;
  quakeOk: boolean;
  errors: string[];
}

interface Drf<T> {
  results?: T[];
}

function extractLatLng(row: Record<string, unknown>): { lat: number; lng: number } | null {
  const point = row["point"] as { coordinates?: unknown } | undefined;
  const coords = point?.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    const lng = num(coords[0]);
    const lat = num(coords[1]);
    if (lat !== null && lng !== null) return { lat, lng };
  }
  const lat = num(row["latitude"]);
  const lng = num(row["longitude"]);
  if (lat !== null && lng !== null) return { lat, lng };
  return null;
}

/** Every monitored river gauge, not just the ones above warning. */
async function loadRiverGauges(): Promise<RiverGauge[]> {
  const data = await fetchJson<Drf<Record<string, unknown>>>(BIPAD_RIVER_URL, {
    revalidate: 300,
  });
  const rows = data.results ?? [];
  const gauges: RiverGauge[] = [];

  for (const row of rows) {
    const level = num(row["waterLevel"]);
    const warning = num(row["warningLevel"]);
    const danger = num(row["dangerLevel"]);
    const severity =
      statusStringToSeverity(str(row["status"])) ?? riverLevelToSeverity(level, warning, danger);

    const station =
      (str(row["title"]) ??
        str(row["name"]) ??
        str(row["stationName"]) ??
        (row["station"] as Record<string, unknown> | undefined)?.["title"] as string | undefined) ??
      "River gauge";
    const loc = extractLatLng(row);

    gauges.push({
      id: `gauge-${str(row["id"]) ?? gauges.length}`,
      station: String(station),
      basin: str(row["basin"]) ?? undefined,
      waterLevel: level ?? undefined,
      warningLevel: warning ?? undefined,
      dangerLevel: danger ?? undefined,
      status: str(row["status"]) ?? undefined,
      trend: str(row["steady"]) ?? undefined,
      issuedAt: str(row["waterLevelOn"]) ?? undefined,
      lat: loc?.lat,
      lng: loc?.lng,
      atDanger: severity === "danger",
      atWarning: severity === "warning",
    });
  }

  return gauges;
}

async function loadQuakes(): Promise<Quake[]> {
  const data = await fetchJson<{ features?: unknown[] }>(USGS_URL, { revalidate: 120 });
  const features = data.features ?? [];
  const quakes: Quake[] = [];

  for (const raw of features) {
    const f = raw as {
      id?: string;
      properties?: Record<string, unknown>;
      geometry?: { coordinates?: unknown };
    };
    const p = f.properties ?? {};
    if ((p["type"] ?? "earthquake") !== "earthquake") continue;

    const mag = num(p["mag"]);
    const coords = f.geometry?.coordinates;
    let lng: number | null = null;
    let lat: number | null = null;
    let depth: number | null = null;
    if (Array.isArray(coords)) {
      lng = num(coords[0]);
      lat = num(coords[1]);
      depth = num(coords[2]);
    }
    const ms = num(p["time"]);
    const url = str(p["url"]);

    quakes.push({
      id: `quake-${f.id ?? quakes.length}`,
      mag: mag ?? undefined,
      place: str(p["place"]) ?? "Nepal region",
      lat: lat ?? undefined,
      lng: lng ?? undefined,
      depthKm: depth ?? undefined,
      issuedAt: ms !== null ? new Date(ms).toISOString() : undefined,
      url: url ?? undefined,
    });
  }

  return quakes;
}

export async function loadMapData(): Promise<MapDataResponse> {
  const generatedAt = nowIso();
  const [rivers, quakes] = await Promise.allSettled([loadRiverGauges(), loadQuakes()]);
  const errors: string[] = [];

  const riverOk = rivers.status === "fulfilled";
  const quakeOk = quakes.status === "fulfilled";
  if (!riverOk) errors.push(rivers.reason instanceof Error ? rivers.reason.message : String(rivers.reason));
  if (!quakeOk) errors.push(quakes.reason instanceof Error ? quakes.reason.message : String(quakes.reason));

  return {
    generatedAt,
    basins: BASINS,
    glacialLakes: GLACIAL_LAKES,
    seismic: SEISMIC,
    rivers: rivers.status === "fulfilled" ? rivers.value : [],
    quakes: quakes.status === "fulfilled" ? quakes.value : [],
    riverOk,
    quakeOk,
    errors,
  };
}

/** Exposed for unit testing without the network. */
export const _internal = { extractLatLng, loadRiverGauges };
