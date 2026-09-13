import type { Alert, Severity } from "@/lib/types";
import type { SourceContext, SourceDescriptor, SourceLoadResult } from "./base";
import { makeSourceRef } from "./base";
import { fetchJson, num } from "./util";
import { GEOGLOWS_REACHES, type GeoglowsReach } from "./geoglows-reaches";

/**
 * GEOGloWS v2 (ECMWF) streamflow forecast adapter.
 *
 * IMPORTANT honesty rules baked in here:
 *  - Everything from this source is `timeframe: "forecast"`, never "now".
 *  - We only emit an alert when the 15-day peak forecast flow reaches at least
 *    the 2-year return period — a threshold that means something to a person —
 *    and we map higher return periods to higher severity. Below 2-year → no
 *    alert (that's good news, not something to dramatise).
 *  - GEOGloWS asks callers not to hammer the REST API, so we iterate only the
 *    small curated reach list and cache for 3 hours.
 *
 * This is enabled only once GEOGLOWS_REACHES is populated; see that file.
 */
import { CONFIG } from "@/lib/config";

const BASE = CONFIG.apis.geoglows;

const V2_FORECAST = (id: number) => `${BASE}/forecast/${id}?format=json`;
const V2_RETURN = (id: number) => `${BASE}/returnperiods/${id}?format=json`;

/** GEOGloWS return-period payloads vary; pull the common thresholds defensively. */
function parseReturnPeriods(raw: unknown): { rp2: number | null; rp5: number | null; rp10: number | null } {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const pick = (...keys: string[]): number | null => {
    for (const k of keys) {
      const v = num(obj[k]);
      if (v !== null) return v;
    }
    return null;
  };
  return {
    rp2: pick("return_period_2", "rp2", "2"),
    rp5: pick("return_period_5", "rp5", "5"),
    rp10: pick("return_period_10", "rp10", "10"),
  };
}

/** Extract the peak of the median forecast flow, tolerating schema drift. */
function parsePeakFlow(raw: unknown): { peak: number | null; peakAt: string | null } {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const flow =
    (obj["flow_median"] as unknown[]) ??
    (obj["flow"] as unknown[]) ??
    (obj["flow_mean"] as unknown[]) ??
    [];
  const times = (obj["datetime"] as unknown[]) ?? [];
  let peak: number | null = null;
  let peakIdx = -1;
  if (Array.isArray(flow)) {
    for (let i = 0; i < flow.length; i++) {
      const v = num(flow[i]);
      if (v !== null && (peak === null || v > peak)) {
        peak = v;
        peakIdx = i;
      }
    }
  }
  const peakAt =
    peakIdx >= 0 && Array.isArray(times) && typeof times[peakIdx] === "string"
      ? (times[peakIdx] as string)
      : null;
  return { peak, peakAt };
}

function severityFromReturnPeriod(
  peak: number,
  rp: { rp2: number | null; rp5: number | null; rp10: number | null },
): Severity | null {
  if (rp.rp10 !== null && peak >= rp.rp10) return "danger";
  if (rp.rp5 !== null && peak >= rp.rp5) return "warning";
  if (rp.rp2 !== null && peak >= rp.rp2) return "watch";
  return null; // below the 2-year level → not alert-worthy
}

async function loadReach(reach: GeoglowsReach, ctx: SourceContext): Promise<Alert | null> {
  const [forecast, returns] = await Promise.all([
    fetchJson(V2_FORECAST(reach.reachId), { revalidate: 10800 }),
    fetchJson(V2_RETURN(reach.reachId), { revalidate: 86400 }),
  ]);
  const { peak, peakAt } = parsePeakFlow(forecast);
  if (peak === null) return null;
  const rp = parseReturnPeriods(returns);
  const severity = severityFromReturnPeriod(peak, rp);
  if (!severity) return null;

  return {
    id: `geoglows-${reach.reachId}`,
    hazard: "flood",
    severity,
    timeframe: "forecast",
    title: { en: `Forecast high flow — ${reach.name}` },
    description: {
      en: "GEOGloWS model forecasts river flow reaching flood-return levels. This is a forecast, not an observed reading.",
    },
    location: { lat: reach.lat, lng: reach.lng, basin: reach.basin },
    issuedAt: ctx.fetchedAt,
    source: makeSourceRef(geoglowsSource, ctx.fetchedAt),
    provenance: "official",
    meta: { peakFlow: peak, peakAt, returnPeriods: rp, model: "GEOGloWS v2 (ECMWF)" },
  };
}

async function load(ctx: SourceContext): Promise<SourceLoadResult> {
  if (GEOGLOWS_REACHES.length === 0) return { alerts: [], scanned: 0 };
  const settled = await Promise.allSettled(GEOGLOWS_REACHES.map((r) => loadReach(r, ctx)));
  const alerts = settled
    .filter((s): s is PromiseFulfilledResult<Alert | null> => s.status === "fulfilled")
    .map((s) => s.value)
    .filter((a): a is Alert => a !== null);
  return { alerts, scanned: GEOGLOWS_REACHES.length };
}

export const geoglowsSource: SourceDescriptor = {
  id: "geoglows-forecast",
  name: "GEOGloWS v2 forecast (ECMWF)",
  url: "https://data.geoglows.org/",
  status: "live",
  timeframe: "forecast",
  hazards: ["flood"],
  note: {
    en: "Model forecast of river flow (lead-time signal) — not an observed water level or an official warning.",
    ne: "नदी बहावको मोडेल पूर्वानुमान — वास्तविक जलस्तर वा आधिकारिक चेतावनी होइन।",
  },
  load,
};

// Exposed for unit testing the threshold logic without the network.
export const _internal = { parsePeakFlow, parseReturnPeriods, severityFromReturnPeriod };
