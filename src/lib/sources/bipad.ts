import type { Alert, HazardType, Severity } from "@/lib/types";
import { SEVERITY_RANK } from "@/lib/types";
import type { SourceContext, SourceDescriptor, SourceLoadResult } from "./base";
import { makeSourceRef } from "./base";
import {
  classifyHazard,
  extractLatLng,
  fetchJson,
  num,
  riverLevelToSeverity,
  statusStringToSeverity,
  str,
} from "./util";
import { CONFIG } from "@/lib/config";

const BASE = CONFIG.apis.bipad;

interface Drf<T> {
  results?: T[];
}

type Row = Record<string, unknown>;

function firstString(row: Row, keys: string[]): string | null {
  for (const k of keys) {
    const v = str(row[k]);
    if (v) return v;
  }
  return null;
}

export function isTelemetryFresh(
  measuredRaw: string | null | undefined,
  nowMs: number,
  maxHours = CONFIG.thresholds.telemetryMaxAgeHours,
): boolean {
  if (!measuredRaw) return false;
  const measuredMs = Date.parse(measuredRaw);
  if (Number.isNaN(measuredMs)) return false;
  const hoursAgo = (nowMs - measuredMs) / 3600_000;
  return hoursAgo >= -1 && hoursAgo <= maxHours;
}

export function parseBipadAlert(
  row: Row,
  nowMs: number,
  fetchedAt: string,
  index = 0,
): Alert | null {
  // Scope: hydromet/geohazard warnings only. Skip air-quality (DoE) etc.
  const source = (str(row["source"]) ?? "").toLowerCase();
  if (source === "doe") return null; // air pollution — out of scope

  const titleEn = firstString(row, ["title", "titleEn"]) ?? "Hazard alert";
  const titleNe = str(row["titleNe"]) ?? undefined;
  const desc = str(row["description"]) ?? "";
  const refData = str(row["referenceData"]) ?? "";

  // Classify hazard across title, hazard field, description, and refData
  let hazard = classifyHazard(`${titleEn} ${titleNe ?? ""} ${str(row["hazard"]) ?? ""} ${desc} ${refData}`);
  if (!hazard && source === "dor") {
    hazard = "landslide"; // Road blocks on Nepal's highways are overwhelmingly landslide/rockfall triggered
  }
  if (!hazard) return null;

  const createdOn = str(row["createdOn"]);
  const createdTime = createdOn ? Date.parse(createdOn) : nowMs;
  const hoursAgo = !Number.isNaN(createdTime) ? (nowMs - createdTime) / 3600_000 : 0;

  // BIPAD/DHM emits automated telemetry alerts with short 10-60m expiration timers.
  // However, hydromet warning conditions and road blockages remain operationally active
  // for hours. Keep active alerts, or recent warnings issued in the last 24h.
  const expireOn = str(row["expireOn"]);
  if (expireOn) {
    const exp = Date.parse(expireOn);
    if (!Number.isNaN(exp) && exp < nowMs && hoursAgo > 24) {
      return null; // Expired AND older than 24h
    }
  } else if (hoursAgo > 48) {
    return null; // No explicit expiry, but older than 48h
  }

  const text = `${titleEn} ${titleNe ?? ""} ${desc}`.toLowerCase();
  const severity: Severity = /danger|red alert|रातो|खतरा/.test(text) ? "danger" : "warning";
  const timeframe = hoursAgo <= 24 ? "now" : "report";

  const loc = extractLatLng(row);
  const rawId = str(row["id"]) ?? str(row["alert_id"]) ?? str(row["uuid"]) ?? `${createdTime || Date.parse(fetchedAt)}-${index}`;
  return {
    id: `bipad-alert-${rawId}`,
    hazard,
    severity,
    timeframe,
    title: { en: titleEn, ne: titleNe },
    description: desc ? { en: desc } : undefined,
    location: loc
      ? { ...loc, district: firstString(row, ["district", "districtName"]) ?? undefined }
      : undefined,
    issuedAt: createdOn ?? fetchedAt,
    expiresAt: expireOn ?? null,
    source: makeSourceRef(bipadAlertSource, fetchedAt),
    provenance: "official",
    meta: { rawSource: source },
  };
}

// ── Official flood/hydromet and road geohazard warnings ─────────────────────
async function loadAlerts(ctx: SourceContext): Promise<SourceLoadResult> {
  const data = await fetchJson<Drf<Row>>(
    `${BASE}/alert/?limit=50&ordering=-created_on`,
    { revalidate: 90 },
  );
  const rows = data.results ?? [];
  const now = Date.parse(ctx.fetchedAt);
  const alerts: Alert[] = [];

  let idx = 0;
  for (const row of rows) {
    const alert = parseBipadAlert(row, now, ctx.fetchedAt, idx++);
    if (alert) {
      alerts.push(alert);
    }
  }

  return { alerts, scanned: rows.length };
}


export function parseRiverStation(
  row: Row,
  nowMs: number,
  fetchedAt: string,
  index = 0,
): Alert | null {
  // Freshness check: Discard telemetry older than configured limit (dead/offline sensors)
  const measuredRaw = str(row["waterLevelOn"]) ?? str(row["modifiedOn"]);
  if (!isTelemetryFresh(measuredRaw, nowMs, CONFIG.thresholds.telemetryMaxAgeHours)) return null;

  const level = num(row["waterLevel"]);
  // Discard missing, negative sentinel (-9999), or physically impossible values (> maxRiverLevelMeters)
  if (level === null || level < 0 || level > CONFIG.thresholds.maxRiverLevelMeters) return null;

  const warning = num(row["warningLevel"]);
  const danger = num(row["dangerLevel"]);
  const statusStr = str(row["status"]);

  const severity =
    statusStringToSeverity(statusStr) ?? riverLevelToSeverity(level, warning, danger);
  // Only surface gauges that are actually at/above warning.
  if (!severity || SEVERITY_RANK[severity] < SEVERITY_RANK.warning) return null;

  const station =
    firstString(row, ["title", "name", "stationName"]) ??
    ((row["station"] as Row | undefined)?.["title"] as string | undefined) ??
    "River gauge";
  const basin = firstString(row, ["basin"]) ?? undefined;
  const trend = str(row["steady"]); // RISING / FALLING / STEADY
  const loc = extractLatLng(row);
  const elevation = num(row["elevation"]) ?? undefined;
  const image = str(row["image"]) ?? undefined;

  const affDemo = row["affectedDemography"] as Row | undefined;
  const affectedDemography = affDemo
    ? {
        maleCount: num(affDemo["maleCount"]) ?? undefined,
        femaleCount: num(affDemo["femaleCount"]) ?? undefined,
        householdCount: num(affDemo["householdCount"]) ?? undefined,
      }
    : undefined;

  const measuredMs = Date.parse(measuredRaw!);
  const hoursAgo = (nowMs - measuredMs) / 3600_000;
  const timeframe = hoursAgo <= CONFIG.thresholds.telemetryAcuteHours ? "now" : "report";

  const stationId = str(row["id"]) ?? str(row["station"]) ?? (measuredRaw ? `${Date.parse(measuredRaw)}-${index}` : `${index}`);

  return {
    id: `bipad-river-${stationId}`,
    hazard: "flood",
    severity,
    timeframe,
    title: { en: String(station) },
    location: loc
      ? { ...loc, basin, district: firstString(row, ["district", "districtName"]) ?? undefined }
      : basin
        ? { basin }
        : undefined,
    issuedAt: measuredRaw!,
    source: makeSourceRef(bipadRiverSource, fetchedAt),
    provenance: "official",
    meta: {
      waterLevel: level,
      warningLevel: warning ?? undefined,
      dangerLevel: danger ?? undefined,
      trend: trend ?? undefined,
      status: statusStr ?? undefined,
      elevation,
      image,
      affectedDemography,
    },
  };
}

// ── Riverwatch: gauges at/above their own warning or danger level ───────────
async function loadRivers(ctx: SourceContext): Promise<SourceLoadResult> {
  let rows: Row[] = [];
  try {
    const data = await fetchJson<Drf<Row>>(
      `${BASE}/river-stations/?limit=200&ordering=-waterLevelOn`,
      { revalidate: 300 },
    );
    rows = data.results ?? [];
  } catch {
    const data = await fetchJson<Drf<Row>>(
      `${BASE}/river/?limit=200&ordering=-id`,
      { revalidate: 300 },
    );
    rows = data.results ?? [];
  }

  const alerts: Alert[] = [];
  const now = Date.parse(ctx.fetchedAt);

  let idx = 0;
  for (const row of rows) {
    const alert = parseRiverStation(row, now, ctx.fetchedAt, idx++);
    if (alert) {
      alerts.push(alert);
    }
  }

  return { alerts, scanned: rows.length };
}

export function parseRainStation(
  row: Row,
  nowMs: number,
  fetchedAt: string,
  index = 0,
): Alert | null {
  // Freshness check: Discard rain gauge telemetry older than configured limit
  const measuredRaw = str(row["measuredOn"]) ?? str(row["modifiedOn"]);
  if (!isTelemetryFresh(measuredRaw, nowMs, CONFIG.thresholds.telemetryMaxAgeHours)) return null;

  const statusStr = str(row["status"]);
  let severity = statusStringToSeverity(statusStr);

  const averages = Array.isArray(row["averages"])
    ? (row["averages"] as Array<{
        value?: number;
        interval?: number;
        status?: { danger?: boolean; warning?: boolean };
      }>)
    : [];

  const hasDangerInterval = averages.some((a) => a.status?.danger === true);
  const hasWarningInterval = averages.some((a) => a.status?.warning === true);

  if (hasDangerInterval) severity = "danger";
  else if (hasWarningInterval && (!severity || SEVERITY_RANK[severity] < SEVERITY_RANK.warning)) {
    severity = "warning";
  }

  if (!severity || SEVERITY_RANK[severity] < SEVERITY_RANK.warning) return null;

  const station = firstString(row, ["title", "name", "stationName"]) ?? "Rain gauge";
  const basin = firstString(row, ["basin"]) ?? undefined;
  const loc = extractLatLng(row);
  const elevation = num(row["elevation"]) ?? undefined;
  const image = str(row["image"]) ?? undefined;

  const rainfall24 =
    averages.find((a) => a.interval === 24)?.value ??
    num(row["averageRainfall"]) ??
    num(row["rainfall"]) ??
    num(row["last24"]) ??
    null;

  const rainfall1 = averages.find((a) => a.interval === 1)?.value ?? null;

  const affDemo = row["affectedDemography"] as Row | undefined;
  const affectedDemography = affDemo
    ? {
        maleCount: num(affDemo["maleCount"]) ?? undefined,
        femaleCount: num(affDemo["femaleCount"]) ?? undefined,
        householdCount: num(affDemo["householdCount"]) ?? undefined,
      }
    : undefined;

  const measuredMs = Date.parse(measuredRaw!);
  const hoursAgo = (nowMs - measuredMs) / 3600_000;
  const timeframe = hoursAgo <= CONFIG.thresholds.telemetryAcuteHours ? "now" : "report";

  const stationId = str(row["id"]) ?? str(row["station"]) ?? (measuredRaw ? `${Date.parse(measuredRaw)}-${index}` : `${index}`);

  return {
    id: `bipad-rain-${stationId}`,
    hazard: "flood",
    severity,
    timeframe,
    title: { en: String(station) },
    description: {
      en: `Heavy rainfall recorded above warning threshold${rainfall24 != null ? ` (${rainfall24} mm in 24h)` : ""}.`,
    },
    location: loc
      ? { ...loc, basin, district: firstString(row, ["district", "districtName"]) ?? undefined }
      : basin
        ? { basin }
        : undefined,
    issuedAt: measuredRaw!,
    source: makeSourceRef(bipadRainSource, fetchedAt),
    provenance: "official",
    meta: {
      rainfall: rainfall24,
      rainfall1h: rainfall1,
      status: statusStr ?? undefined,
      averages: averages.length > 0 ? averages : undefined,
      elevation,
      image,
      affectedDemography,
    },
  };
}

// ── Rainwatch: stations reporting rainfall above their warning threshold ────
async function loadRain(ctx: SourceContext): Promise<SourceLoadResult> {
  let rows: Row[] = [];
  try {
    const data = await fetchJson<Drf<Row>>(
      `${BASE}/rain-stations/?limit=200&ordering=-measuredOn`,
      { revalidate: 600 },
    );
    rows = data.results ?? [];
  } catch {
    const data = await fetchJson<Drf<Row>>(
      `${BASE}/rain/?limit=200&ordering=-id`,
      { revalidate: 600 },
    );
    rows = data.results ?? [];
  }

  const alerts: Alert[] = [];
  const now = Date.parse(ctx.fetchedAt);

  let idx = 0;
  for (const row of rows) {
    const alert = parseRainStation(row, now, ctx.fetchedAt, idx++);
    if (alert) {
      alerts.push(alert);
    }
  }

  return { alerts, scanned: rows.length };
}

// ── Recent incidents (lags reality — labelled "recent", not "live") ─────────
async function loadIncidents(ctx: SourceContext): Promise<SourceLoadResult> {
  const data = await fetchJson<Drf<Row>>(
    `${BASE}/incident/?limit=50&ordering=-incident_on`,
    { revalidate: 900 },
  );
  const rows = data.results ?? [];
  const now = Date.parse(ctx.fetchedAt);
  const alerts: Alert[] = [];

  for (const row of rows) {
    const hazardText = firstString(row, ["hazardTitle", "hazard", "title"]) ?? "";
    const hazard = classifyHazard(hazardText);
    // Only hydromet/geohazards in scope; skip fire, epidemic, accidents, etc.
    if (!hazard) continue;

    const incidentOn = str(row["incidentOn"]) ?? str(row["createdOn"]);
    if (incidentOn) {
      const t = Date.parse(incidentOn);
      // Keep only recent incidents from the last 5 days (120h) for context
      if (!Number.isNaN(t) && now - t > 5 * 86400_000) continue;
    }

    const deaths = num(row["peopleDeathCount"]) ?? num(row["deathCount"]) ?? 0;
    const severity: Severity = (deaths ?? 0) > 0 ? "watch" : "advisory";
    const loc = extractLatLng(row);
    const titleEn = firstString(row, ["title", "hazardTitle"]) ?? "Recent incident";

    const incId = str(row["id"]) ?? str(row["incident_id"]) ?? `${incidentOn ? Date.parse(incidentOn) : now}-${alerts.length}`;
    alerts.push({
      id: `bipad-incident-${incId}`,
      hazard,
      severity,
      timeframe: "now",
      title: { en: titleEn },
      location: loc
        ? { ...loc, district: firstString(row, ["district", "districtName"]) ?? undefined }
        : undefined,
      issuedAt: incidentOn ?? ctx.fetchedAt,
      source: makeSourceRef(bipadIncidentSource, ctx.fetchedAt),
      provenance: "official",
      meta: { deaths },
    });
  }

  return { alerts, scanned: rows.length };
}

export const bipadAlertSource: SourceDescriptor = {
  id: "bipad-alert",
  name: "NDRRMA BIPAD — DHM warnings",
  url: "https://bipadportal.gov.np/alert",
  status: "live",
  timeframe: "now",
  hazards: ["flood", "glof", "landslide"],
  load: loadAlerts,
};

export const bipadRiverSource: SourceDescriptor = {
  id: "bipad-river",
  name: "DHM Riverwatch (via BIPAD)",
  url: "https://bipadportal.gov.np/realtime-monitoring",
  status: "live",
  timeframe: "now",
  hazards: ["flood"],
  load: loadRivers,
};

export const bipadRainSource: SourceDescriptor = {
  id: "bipad-rain",
  name: "DHM Rainwatch (via BIPAD)",
  url: "https://bipadportal.gov.np/realtime-monitoring",
  status: "live",
  timeframe: "now",
  hazards: ["flood"],
  load: loadRain,
};

export const bipadIncidentSource: SourceDescriptor = {
  id: "bipad-incident",
  name: "NDRRMA BIPAD — recent incidents",
  url: "https://bipadportal.gov.np/incidents",
  status: "recent",
  timeframe: "now",
  hazards: ["flood", "landslide", "glof"],
  note: {
    en: "Incident reports lag events by hours to days — not a real-time warning.",
    ne: "घटना विवरणहरू केही घण्टादेखि दिनसम्म ढिलो हुन्छन् — वास्तविक-समय चेतावनी होइन।",
  },
  load: loadIncidents,
};

export const _internal = {
  isTelemetryFresh,
  parseBipadAlert,
  parseRiverStation,
  parseRainStation,
  BASE,
};

