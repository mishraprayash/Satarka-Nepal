/**
 * Everything the hazard map needs, in one honest envelope:
 *   - static REFERENCE layers (basins, glacial lakes, seismic context)
 *   - LIVE layers (DHM river gauges via BIPAD, USGS earthquakes)
 *
 * The live layers are loaded independently and reported separately so one
 * failing feed degrades the map without breaking it — and the UI can say
 * which layer is stale, instead of pretending it is current.
 */
import { extractLatLng, fetchJson, num, nowIso, riverLevelToSeverity, statusStringToSeverity, str } from "@/lib/sources/util";
import { BASINS, type Basin } from "./map-data/basins";
import { GLACIAL_LAKES, type GlacialLake } from "./map-data/glacial-lakes";
import { SEISMIC, type SeismicFeature } from "./map-data/seismic";
import type { HighwayBlockage } from "@/lib/types";
import { loadHighways } from "@/lib/sources/highway";
import { isTelemetryFresh } from "@/lib/sources/bipad";
import { CONFIG } from "@/lib/config";

const BIPAD_RIVER_STATIONS_URL = `${CONFIG.apis.bipad}/river-stations/?limit=200&ordering=-waterLevelOn`;
const BIPAD_RIVER_LEGACY_URL = `${CONFIG.apis.bipad}/river/?limit=200&ordering=-id`;
const USGS_URL =
  `${CONFIG.apis.usgs}${CONFIG.apis.usgs.includes("?") ? "&" : "?"}` +
  "minlatitude=26&maxlatitude=31&minlongitude=80&maxlongitude=89" +
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
  elevation?: number;
  image?: string;
  issuedAt?: string;
  atDanger: boolean;
  atWarning: boolean;
  stale?: boolean;
  affectedDemography?: {
    maleCount?: number;
    femaleCount?: number;
    householdCount?: number;
  };
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
  highways: HighwayBlockage[];
  riverOk: boolean;
  quakeOk: boolean;
  highwayOk: boolean;
  errors: string[];
}

interface Drf<T> {
  results?: T[];
}

/** Every monitored river gauge, pulling from river-stations with legacy fallback. */
async function loadRiverGauges(): Promise<RiverGauge[]> {
  let rows: Record<string, unknown>[] = [];
  try {
    const data = await fetchJson<Drf<Record<string, unknown>>>(BIPAD_RIVER_STATIONS_URL, {
      revalidate: 300,
    });
    rows = data.results ?? [];
  } catch {
    const data = await fetchJson<Drf<Record<string, unknown>>>(BIPAD_RIVER_LEGACY_URL, {
      revalidate: 300,
    });
    rows = data.results ?? [];
  }

  const gauges: RiverGauge[] = [];
  const nowMs = Date.now();

  for (const row of rows) {
    const measuredRaw = str(row["waterLevelOn"]) ?? str(row["modifiedOn"]);
    const isFresh = isTelemetryFresh(measuredRaw, nowMs, CONFIG.thresholds.telemetryMaxAgeHours);

    let level = num(row["waterLevel"]);
    if (level !== null && (level < 0 || level > CONFIG.thresholds.maxRiverLevelMeters)) {
      level = null; // discard sentinel or absurd values
    }

    const warning = num(row["warningLevel"]);
    const danger = num(row["dangerLevel"]);
    const severity =
      statusStringToSeverity(str(row["status"])) ?? riverLevelToSeverity(level, warning, danger);

    const station =
      (str(row["title"]) ??
        str(row["name"]) ??
        str(row["stationName"]) ??
        ((row["station"] as Record<string, unknown> | undefined)?.["title"] as string | undefined)) ??
      "River gauge";
    const loc = extractLatLng(row);
    const elevation = num(row["elevation"]) ?? undefined;
    const image = str(row["image"]) ?? undefined;

    const affDemo = row["affectedDemography"] as Record<string, unknown> | undefined;
    const affectedDemography = affDemo
      ? {
          maleCount: num(affDemo["maleCount"]) ?? undefined,
          femaleCount: num(affDemo["femaleCount"]) ?? undefined,
          householdCount: num(affDemo["householdCount"]) ?? undefined,
        }
      : undefined;

    gauges.push({
      id: `gauge-${str(row["id"]) ?? gauges.length}`,
      station: String(station),
      basin: str(row["basin"]) ?? undefined,
      waterLevel: level ?? undefined,
      warningLevel: warning ?? undefined,
      dangerLevel: danger ?? undefined,
      status: str(row["status"]) ?? undefined,
      trend: str(row["steady"]) ?? undefined,
      issuedAt: measuredRaw ?? undefined,
      elevation,
      image,
      affectedDemography,
      lat: loc?.lat,
      lng: loc?.lng,
      atDanger: isFresh && severity === "danger",
      atWarning: isFresh && severity === "warning",
      stale: !isFresh,
    });
  }

  return gauges;
}

async function loadQuakes(): Promise<Quake[]> {
  const startTime = new Date(
    Date.now() - CONFIG.thresholds.earthquakeMaxAgeDays * 86400_000,
  ).toISOString();
  const url = `${USGS_URL}&starttime=${encodeURIComponent(startTime)}`;
  const data = await fetchJson<{ features?: unknown[] }>(url, { revalidate: 120 });
  const features = data.features ?? [];
  const quakes: Quake[] = [];
  const nowMs = Date.now();

  for (const raw of features) {
    const f = raw as {
      id?: string;
      properties?: Record<string, unknown>;
      geometry?: { coordinates?: unknown };
    };
    const p = f.properties ?? {};
    if ((p["type"] ?? "earthquake") !== "earthquake") continue;

    const ms = num(p["time"]);
    if (ms === null) continue;
    const hoursAgo = (nowMs - ms) / 3600_000;
    if (hoursAgo > CONFIG.thresholds.earthquakeMaxAgeDays * 24) continue;

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
    const eventUrl = str(p["url"]);

    quakes.push({
      id: `quake-${f.id ?? quakes.length}`,
      mag: mag ?? undefined,
      place: str(p["place"]) ?? "Nepal region",
      lat: lat ?? undefined,
      lng: lng ?? undefined,
      depthKm: depth ?? undefined,
      issuedAt: new Date(ms).toISOString(),
      url: eventUrl ?? undefined,
    });
  }

  return quakes;
}

export async function loadMapData(): Promise<MapDataResponse> {
  const generatedAt = nowIso();
  const [rivers, quakes, highways] = await Promise.allSettled([
    loadRiverGauges(),
    loadQuakes(),
    loadHighways(),
  ]);
  const errors: string[] = [];

  const riverOk = rivers.status === "fulfilled";
  const quakeOk = quakes.status === "fulfilled";
  const highwayOk = highways.status === "fulfilled";

  if (!riverOk) errors.push(rivers.reason instanceof Error ? rivers.reason.message : String(rivers.reason));
  if (!quakeOk) errors.push(quakes.reason instanceof Error ? quakes.reason.message : String(quakes.reason));
  if (!highwayOk) errors.push(highways.reason instanceof Error ? highways.reason.message : String(highways.reason));

  return {
    generatedAt,
    basins: BASINS,
    glacialLakes: GLACIAL_LAKES,
    seismic: SEISMIC,
    rivers: rivers.status === "fulfilled" ? rivers.value : [],
    quakes: quakes.status === "fulfilled" ? quakes.value : [],
    highways: highways.status === "fulfilled" ? highways.value : [],
    riverOk,
    quakeOk,
    highwayOk,
    errors,
  };
}

/** Exposed for unit testing without the network. `extractLatLng` now lives in
 * sources/util (shared with the BIPAD source) and is re-exported here so the
 * existing test suite keeps its import path. */
export const _internal = { extractLatLng, loadRiverGauges };

