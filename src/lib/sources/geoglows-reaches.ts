/**
 * Curated GEOGloWS v2 river reaches for Nepal's major basins.
 *
 * GEOGloWS provides a 15-day, 3-hourly streamflow FORECAST (global ECMWF
 * model) — a genuine lead-time signal, but NOT observed water level and NOT
 * gauge-calibrated to DHM. To say anything honest ("forecast approaching the
 * 2-year flood level") we need, per reach:
 *   - `reachId`  — the TDX-Hydro LINKNO, obtained from the stream selector at
 *                  https://data.geoglows.org (click the river → copy the ID).
 *   - human labels + which basin/district it represents.
 *
 * This list is intentionally EMPTY in v1: the IDs must be curated by hand from
 * the selector (see plan "open items"), and we will not invent them. While it
 * is empty the GEOGloWS source is NOT registered (see sources/index.ts) and the
 * app represents the forecast dimension as an honest link-out to GEOGloWS and
 * ICIMOD's flash-flood tools instead of a half-wired feed.
 */
export interface GeoglowsReach {
  reachId: number;
  name: string;
  basin: string;
  lat: number;
  lng: number;
}

export const GEOGLOWS_REACHES: GeoglowsReach[] = [
  // e.g. { reachId: 760000000, name: "Koshi at Chatara", basin: "Koshi", lat: 26.87, lng: 87.15 },
];
