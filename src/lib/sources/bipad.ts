import type { Alert, HazardType, Severity } from "@/lib/types";
import { SEVERITY_RANK } from "@/lib/types";
import type { SourceContext, SourceDescriptor, SourceLoadResult } from "./base";
import { makeSourceRef } from "./base";
import {
  extractLatLng,
  fetchJson,
  num,
  riverLevelToSeverity,
  statusStringToSeverity,
  str,
} from "./util";

/**
 * NDRRMA BIPAD portal — the national aggregator that already proxies DHM's
 * flood/riverwatch/rainwatch feeds. We hit it server-side because CORS is
 * unverified and the payloads need scrubbing:
 *   - `count` is a bogus int64 (9223372036854775807) — never page by it.
 *   - readings use sentinels like -9999 / -99991 for "no data".
 *   - some river rows go stale while rain stays live — trust timestamps.
 * BIPAD's own `earthquake/` feed is ~1yr stale, so quakes come from USGS.
 */

const BASE = "https://bipadportal.gov.np/api/v1";

interface Drf<T> {
  results?: T[];
}

type Row = Record<string, unknown>;

function classifyHazard(text: string): HazardType | null {
  const t = text.toLowerCase();
  if (/glof|glacial lake|outburst|हिमताल/.test(t)) return "glof";
  if (/landslide|pahiro|debris|rockfall|highway|road.*close|सडक.*बन्द|पहिरो/.test(t)) return "landslide";
  if (/earthquake|quake|भूकम्प|seismic/.test(t)) return "earthquake";
  // Reject fire-related incidents — not a supported hazard type.
  if (/fire|आगो|आगलागी|दावानल/.test(t)) return null;
  if (/flood|rain|rainfall|बाढी|जलप्लावन|वर्षा|भारी वर्षा|cloudburst|waterlog/.test(t)) return "flood";
  return null;
}

function firstString(row: Row, keys: string[]): string | null {
  for (const k of keys) {
    const v = str(row[k]);
    if (v) return v;
  }
  return null;
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

  for (const row of rows) {
    // Scope: hydromet/geohazard warnings only. Skip air-quality (DoE) etc.
    const source = (str(row["source"]) ?? "").toLowerCase();
    if (source === "doe") continue; // air pollution — out of scope

    const titleEn = firstString(row, ["title", "titleEn"]) ?? "Hazard alert";
    const titleNe = str(row["titleNe"]) ?? undefined;
    const desc = str(row["description"]) ?? "";
    const refData = str(row["referenceData"]) ?? "";

    // Classify hazard across title, hazard field, description, and refData
    let hazard = classifyHazard(`${titleEn} ${titleNe ?? ""} ${str(row["hazard"]) ?? ""} ${desc} ${refData}`);
    if (!hazard && source === "dor") {
      hazard = "landslide"; // Road blocks on Nepal's highways are overwhelmingly landslide/rockfall triggered
    }
    if (!hazard) continue;

    const createdOn = str(row["createdOn"]);
    const createdTime = createdOn ? Date.parse(createdOn) : now;
    const hoursAgo = !Number.isNaN(createdTime) ? (now - createdTime) / 3600_000 : 0;

    // BIPAD/DHM emits automated telemetry alerts with short 10-60m expiration timers.
    // However, hydromet warning conditions and road blockages remain operationally active
    // for hours. Keep active alerts, or recent warnings issued in the last 24h.
    const expireOn = str(row["expireOn"]);
    if (expireOn) {
      const exp = Date.parse(expireOn);
      if (!Number.isNaN(exp) && exp < now && hoursAgo > 24) {
        continue; // Expired AND older than 24h
      }
    } else if (hoursAgo > 48) {
      continue; // No explicit expiry, but older than 48h
    }

    const text = `${titleEn} ${titleNe ?? ""} ${desc}`.toLowerCase();
    const severity: Severity = /danger|red alert|रातो|खतरा/.test(text) ? "danger" : "warning";

    const loc = extractLatLng(row);
    alerts.push({
      id: `bipad-alert-${str(row["id"]) ?? alerts.length}`,
      hazard,
      severity,
      timeframe: "now",
      title: { en: titleEn, ne: titleNe },
      description: desc ? { en: desc } : undefined,
      location: loc
        ? { ...loc, district: firstString(row, ["district", "districtName"]) ?? undefined }
        : undefined,
      issuedAt: createdOn ?? ctx.fetchedAt,
      expiresAt: expireOn ?? null,
      source: makeSourceRef(bipadAlertSource, ctx.fetchedAt),
      provenance: "official",
      meta: { rawSource: source },
    });
  }

  return { alerts, scanned: rows.length };
}


// ── Riverwatch: gauges at/above their own warning or danger level ───────────
async function loadRivers(ctx: SourceContext): Promise<SourceLoadResult> {
  const data = await fetchJson<Drf<Row>>(
    `${BASE}/river/?limit=200&ordering=-id`,
    { revalidate: 300 },
  );
  const rows = data.results ?? [];
  const alerts: Alert[] = [];

  for (const row of rows) {
    const level = num(row["waterLevel"]);
    const warning = num(row["warningLevel"]);
    const danger = num(row["dangerLevel"]);
    const statusStr = str(row["status"]);

    const severity =
      statusStringToSeverity(statusStr) ?? riverLevelToSeverity(level, warning, danger);
    // Only surface gauges that are actually at/above warning.
    if (!severity || SEVERITY_RANK[severity] < SEVERITY_RANK.warning) continue;

    const station =
      firstString(row, ["title", "name", "stationName"]) ??
      (row["station"] as Row | undefined)?.["title"] as string | undefined ??
      "River gauge";
    const basin = firstString(row, ["basin"]) ?? undefined;
    const trend = str(row["steady"]); // RISING / FALLING / STEADY
    const loc = extractLatLng(row);

    alerts.push({
      id: `bipad-river-${str(row["id"]) ?? alerts.length}`,
      hazard: "flood",
      severity,
      timeframe: "now",
      title: { en: String(station) },
      location: loc
        ? { ...loc, basin, district: firstString(row, ["district"]) ?? undefined }
        : basin
          ? { basin }
          : undefined,
      issuedAt: str(row["waterLevelOn"]) ?? ctx.fetchedAt,
      source: makeSourceRef(bipadRiverSource, ctx.fetchedAt),
      provenance: "official",
      meta: {
        waterLevel: level,
        warningLevel: warning,
        dangerLevel: danger,
        trend: trend ?? undefined,
        status: statusStr ?? undefined,
      },
    });
  }

  return { alerts, scanned: rows.length };
}

// ── Rainwatch: stations reporting rainfall above their warning threshold ────
async function loadRain(ctx: SourceContext): Promise<SourceLoadResult> {
  const data = await fetchJson<Drf<Row>>(
    `${BASE}/rain/?limit=200&ordering=-id`,
    { revalidate: 600 },
  );
  const rows = data.results ?? [];
  const alerts: Alert[] = [];

  for (const row of rows) {
    const severity = statusStringToSeverity(str(row["status"]));
    if (!severity || SEVERITY_RANK[severity] < SEVERITY_RANK.warning) continue;

    const station = firstString(row, ["title", "name", "stationName"]) ?? "Rain gauge";
    const basin = firstString(row, ["basin"]) ?? undefined;
    const loc = extractLatLng(row);
    const rainfall =
      num(row["averageRainfall"]) ??
      num(row["rainfall"]) ??
      num(row["last24"]) ??
      null;

    alerts.push({
      id: `bipad-rain-${str(row["id"]) ?? alerts.length}`,
      hazard: "flood",
      severity,
      timeframe: "now",
      title: { en: String(station) },
      description: { en: "Heavy rainfall recorded above the warning threshold." },
      location: loc ? { ...loc, basin } : basin ? { basin } : undefined,
      issuedAt: str(row["measuredOn"]) ?? str(row["modifiedOn"]) ?? ctx.fetchedAt,
      source: makeSourceRef(bipadRainSource, ctx.fetchedAt),
      provenance: "official",
      meta: { rainfall, status: str(row["status"]) ?? undefined },
    });
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
      // Keep the last ~10 days of relevant incidents for context.
      if (!Number.isNaN(t) && now - t > 10 * 86400_000) continue;
    }

    const deaths = num(row["peopleDeathCount"]) ?? num(row["deathCount"]) ?? 0;
    const severity: Severity = (deaths ?? 0) > 0 ? "watch" : "advisory";
    const loc = extractLatLng(row);
    const titleEn = firstString(row, ["title", "hazardTitle"]) ?? "Recent incident";

    alerts.push({
      id: `bipad-incident-${str(row["id"]) ?? alerts.length}`,
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
