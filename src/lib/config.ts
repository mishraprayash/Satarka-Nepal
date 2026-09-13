/**
 * Centralized Application & Upstream Service Configuration.
 *
 * Consolidates all API endpoints, timeouts, cache TTLs, and domain thresholds.
 * Every endpoint supports environment variable overrides for staging, mock testing,
 * and deployment customization without touching source code.
 */

export const CONFIG = Object.freeze({
  app: {
    name: "Satarka",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "https://satarka.app",
    userAgent: "Satarka/0.1 (+Nepal disaster awareness; non-commercial)",
  },

  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  apis: {
    bipad: process.env.BIPAD_API_URL ?? "https://bipadportal.gov.np/api/v1",
    usgs:
      process.env.USGS_API_URL ??
      "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson",
    dorNavigate:
      process.env.DOR_NAVIGATE_API_URL ?? "https://navigate.dor.gov.np/api",
    openMeteoForecast:
      process.env.OPEN_METEO_FORECAST_URL ?? "https://api.open-meteo.com/v1/forecast",
    openMeteoAirQuality:
      process.env.OPEN_METEO_AIR_QUALITY_URL ??
      "https://air-quality-api.open-meteo.com/v1/air-quality",
    reliefweb:
      process.env.RELIEFWEB_API_URL ?? "https://api.reliefweb.int/v2/reports",
    reliefwebAppName: process.env.RELIEFWEB_APPNAME ?? "satarka.app",
    gdacs:
      process.env.GDACS_API_URL ??
      "https://www.gdacs.org/gdacsapi/api/events/geteventlist/EVENTS4APP",
    geoglows:
      process.env.GEOGLOWS_API_URL ?? "https://geoglows.ecmwf.int/api/v2",
  },

  timeouts: {
    /** Standard HTTP timeout for upstream feeds (9s) */
    defaultMs: 9000,
    /** Extended timeout for slower global feeds e.g. GDACS (15s) */
    extendedMs: 15000,
    /** Client-side geolocation timeout (8s) */
    geolocationMs: 8000,
  },

  cache: {
    /** In-memory snapshot freshness before triggering background refresh (45s) */
    alertsFreshnessMs: 45_000,
    /** Next.js ISR route revalidation window (seconds) */
    alertsRevalidateSec: 60,
    highwaysRevalidateSec: 120,
    mapDataRevalidateSec: 300,
    reportsRevalidateSec: 900,
    weatherRevalidateSec: 900,
  },

  thresholds: {
    /** Maximum age in hours for river/rain telemetry before considering sensor dead/stale */
    telemetryMaxAgeHours: 36,
    /** Acute alert window for river/rain telemetry in hours */
    telemetryAcuteHours: 12,
    /** Maximum age in days for active earthquake monitoring */
    earthquakeMaxAgeDays: 7,
    /** Earthquakes newer than this are classified as acute "now"; older are "report" */
    earthquakeAcuteHours: 24,
    /** Maximum age in days for active roadblock incident tracking */
    highwayMaxAgeDays: 14,
    /** Blockages newer than this are classified as acute "now"; older are "report" */
    highwayAcuteHours: 48,
    /** Physical sanity ceiling for Nepal river gauge water level (meters) */
    maxRiverLevelMeters: 80,
    /** Physical sanity ceiling for 24h rainfall (mm) */
    maxRainfallMm24h: 1000,
    /** Rainfall thresholds for flood risk (mm in 24 hours) */
    rainWarningMm24h: 140,
    rainDangerMm24h: 200,
    /** GEOGloWS flood model return period thresholds (years) */
    geoglowsReturnPeriodWatchYears: 2,
    geoglowsReturnPeriodWarningYears: 5,
    geoglowsReturnPeriodDangerYears: 10,
  },
});
