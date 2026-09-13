import { describe, expect, it } from "vitest";
import { _internal } from "./bipad";

describe("bipad isTelemetryFresh", () => {
  const nowMs = Date.parse("2026-09-13T12:00:00.000Z");

  it("returns true for readings within 36 hours", () => {
    const twoHoursAgo = new Date(nowMs - 2 * 3600_000).toISOString();
    expect(_internal.isTelemetryFresh(twoHoursAgo, nowMs, 36)).toBe(true);

    const thirtyHoursAgo = new Date(nowMs - 30 * 3600_000).toISOString();
    expect(_internal.isTelemetryFresh(thirtyHoursAgo, nowMs, 36)).toBe(true);
  });

  it("returns false for readings older than 36 hours (dead/offline sensors)", () => {
    const fortyHoursAgo = new Date(nowMs - 40 * 3600_000).toISOString();
    expect(_internal.isTelemetryFresh(fortyHoursAgo, nowMs, 36)).toBe(false);

    const twentyFourDaysAgo = new Date(nowMs - 24 * 86400_000).toISOString();
    expect(_internal.isTelemetryFresh(twentyFourDaysAgo, nowMs, 36)).toBe(false);
  });

  it("returns false for invalid date strings and null/undefined", () => {
    expect(_internal.isTelemetryFresh(null, nowMs)).toBe(false);
    expect(_internal.isTelemetryFresh(undefined, nowMs)).toBe(false);
    expect(_internal.isTelemetryFresh("invalid-date", nowMs)).toBe(false);
  });
});

describe("bipad parseRiverStation", () => {
  const nowMs = Date.parse("2026-09-13T12:00:00.000Z");
  const fetchedAt = "2026-09-13T12:00:00.000Z";

  it("discards stale river readings older than 36 hours", () => {
    const staleRow = {
      id: 101,
      title: "Karnali at Chisapani",
      waterLevel: 12.5,
      warningLevel: 10.0,
      dangerLevel: 11.0,
      waterLevelOn: new Date(nowMs - 48 * 3600_000).toISOString(),
    };

    const alert = _internal.parseRiverStation(staleRow, nowMs, fetchedAt);
    expect(alert).toBeNull();
  });

  it("discards sentinel negative or out-of-bounds water levels", () => {
    const negativeRow = {
      id: 102,
      title: "Koshy at Chatara",
      waterLevel: -9999,
      warningLevel: 5.0,
      dangerLevel: 6.0,
      waterLevelOn: new Date(nowMs - 3600_000).toISOString(),
    };
    expect(_internal.parseRiverStation(negativeRow, nowMs, fetchedAt)).toBeNull();

    const absurdRow = {
      id: 103,
      title: "Narayani",
      waterLevel: 95.0, // > 80m limit
      warningLevel: 7.0,
      dangerLevel: 9.0,
      waterLevelOn: new Date(nowMs - 3600_000).toISOString(),
    };
    expect(_internal.parseRiverStation(absurdRow, nowMs, fetchedAt)).toBeNull();
  });

  it("surfaces danger alert when river water level >= dangerLevel", () => {
    const dangerRow = {
      id: 104,
      title: "Narayani at Devghat",
      waterLevel: 10.2,
      warningLevel: 7.3,
      dangerLevel: 9.0,
      waterLevelOn: new Date(nowMs - 3600_000).toISOString(),
      point: { coordinates: [84.42, 27.71] },
      basin: "Narayani",
      steady: "RISING",
    };

    const alert = _internal.parseRiverStation(dangerRow, nowMs, fetchedAt);
    expect(alert).not.toBeNull();
    expect(alert?.severity).toBe("danger");
    expect(alert?.hazard).toBe("flood");
    expect(alert?.timeframe).toBe("now");
    expect(alert?.title.en).toBe("Narayani at Devghat");
    expect(alert?.location?.lat).toBe(27.71);
    expect(alert?.location?.lng).toBe(84.42);
    expect(alert?.meta?.waterLevel).toBe(10.2);
    expect(alert?.meta?.trend).toBe("RISING");
  });

  it("ignores river stations operating below warning level", () => {
    const normalRow = {
      id: 105,
      title: "Bagmati at Sundarijal",
      waterLevel: 1.5,
      warningLevel: 4.0,
      dangerLevel: 5.5,
      waterLevelOn: new Date(nowMs - 3600_000).toISOString(),
    };

    const alert = _internal.parseRiverStation(normalRow, nowMs, fetchedAt);
    expect(alert).toBeNull();
  });
});

describe("bipad parseRainStation", () => {
  const nowMs = Date.parse("2026-09-13T12:00:00.000Z");
  const fetchedAt = "2026-09-13T12:00:00.000Z";

  it("discards stale rain readings older than 36 hours", () => {
    const staleRow = {
      id: 201,
      title: "Pokhara Airport",
      measuredOn: new Date(nowMs - 50 * 3600_000).toISOString(),
      averages: [{ interval: 24, value: 160, status: { danger: true } }],
    };

    expect(_internal.parseRainStation(staleRow, nowMs, fetchedAt)).toBeNull();
  });

  it("surfaces danger alert for active high rainfall station", () => {
    const rainRow = {
      id: 202,
      title: "Lumle, Kaski",
      measuredOn: new Date(nowMs - 2 * 3600_000).toISOString(),
      averages: [
        { interval: 1, value: 35, status: { warning: true } },
        { interval: 24, value: 210, status: { danger: true } },
      ],
      point: { coordinates: [83.8, 28.3] },
    };

    const alert = _internal.parseRainStation(rainRow, nowMs, fetchedAt);
    expect(alert).not.toBeNull();
    expect(alert?.severity).toBe("danger");
    expect(alert?.hazard).toBe("flood");
    expect(alert?.meta?.rainfall).toBe(210);
    expect(alert?.description?.en).toContain("210 mm in 24h");
  });
});

describe("bipad parseBipadAlert", () => {
  const nowMs = Date.parse("2026-09-13T12:00:00.000Z");
  const fetchedAt = "2026-09-13T12:00:00.000Z";

  it("ignores Department of Environment air quality alerts", () => {
    const doeRow = {
      id: 301,
      source: "doe",
      title: "Air Quality Index High in Kathmandu",
    };
    expect(_internal.parseBipadAlert(doeRow, nowMs, fetchedAt)).toBeNull();
  });

  it("maps Department of Roads alerts to landslide hazard", () => {
    const dorRow = {
      id: 302,
      source: "dor",
      title: "Prithvi Highway Blocked at Mugling",
      createdOn: new Date(nowMs - 3600_000).toISOString(),
    };

    const alert = _internal.parseBipadAlert(dorRow, nowMs, fetchedAt);
    expect(alert).not.toBeNull();
    expect(alert?.hazard).toBe("landslide");
    expect(alert?.timeframe).toBe("now");
  });

  it("discards expired alerts older than 24 hours", () => {
    const expiredRow = {
      id: 303,
      source: "dhm",
      title: "Heavy Rainfall Warning",
      hazard: "flood",
      createdOn: new Date(nowMs - 48 * 3600_000).toISOString(),
      expireOn: new Date(nowMs - 30 * 3600_000).toISOString(), // expired 30h ago
    };

    expect(_internal.parseBipadAlert(expiredRow, nowMs, fetchedAt)).toBeNull();
  });
});
