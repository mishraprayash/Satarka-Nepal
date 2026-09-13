import { describe, expect, it } from "vitest";
import { CONFIG } from "./config";

describe("CONFIG centralized configuration", () => {
  it("is deeply frozen against runtime mutations", () => {
    expect(Object.isFrozen(CONFIG)).toBe(true);
    expect(CONFIG.app.name).toBe("Satarka");
    expect(CONFIG.app.url).toContain("satarka.app");
  });

  it("contains valid endpoints for all upstream services", () => {
    expect(CONFIG.apis.bipad).toContain("bipadportal.gov.np");
    expect(CONFIG.apis.usgs).toContain("earthquake.usgs.gov");
    expect(CONFIG.apis.dorNavigate).toContain("navigate.dor.gov.np");
    expect(CONFIG.apis.openMeteoForecast).toContain("api.open-meteo.com");
    expect(CONFIG.apis.openMeteoAirQuality).toContain("air-quality-api.open-meteo.com");
    expect(CONFIG.apis.reliefweb).toContain("api.reliefweb.int");
    expect(CONFIG.apis.gdacs).toContain("gdacs.org");
    expect(CONFIG.apis.geoglows).toContain("geoglows.ecmwf.int");
  });

  it("defines physically reasonable threshold values", () => {
    expect(CONFIG.thresholds.telemetryMaxAgeHours).toBe(36);
    expect(CONFIG.thresholds.earthquakeMaxAgeDays).toBe(7);
    expect(CONFIG.thresholds.highwayMaxAgeDays).toBe(14);
    expect(CONFIG.thresholds.maxRiverLevelMeters).toBe(80);
    expect(CONFIG.thresholds.rainWarningMm24h).toBeLessThan(CONFIG.thresholds.rainDangerMm24h);
  });
});
