import { describe, expect, it } from "vitest";
import { _internal } from "./usgs";

describe("usgs parseUsgsFeature", () => {
  const nowMs = Date.parse("2026-09-13T12:00:00.000Z");
  const fetchedAt = "2026-09-13T12:00:00.000Z";

  it("parses recent earthquake within 24h as 'now' timeframe", () => {
    const feature = {
      id: "nc123456",
      properties: {
        mag: 5.4,
        place: "28 km NE of Kathmandu, Nepal",
        time: nowMs - 2 * 3600_000, // 2 hours ago
        type: "earthquake",
        url: "https://earthquake.usgs.gov/earthquakes/event/nc123456",
      },
      geometry: {
        coordinates: [85.52, 27.85, 10.5],
      },
    };

    const alert = _internal.parseUsgsFeature(feature, nowMs, fetchedAt);
    expect(alert).not.toBeNull();
    expect(alert?.id).toBe("usgs-nc123456");
    expect(alert?.hazard).toBe("earthquake");
    expect(alert?.severity).toBe("warning"); // M5.4 is warning
    expect(alert?.timeframe).toBe("now");
    expect(alert?.title.en).toBe("M 5.4 — 28 km NE of Kathmandu, Nepal");
    expect(alert?.location?.lat).toBe(27.85);
    expect(alert?.location?.lng).toBe(85.52);
    expect(alert?.meta?.magnitude).toBe(5.4);
    expect(alert?.meta?.depthKm).toBe(10.5);
  });

  it("marks earthquakes between 24h and 7 days as 'report' timeframe", () => {
    const feature = {
      id: "us7000abcd",
      properties: {
        mag: 6.2,
        place: "Western Nepal",
        time: nowMs - 48 * 3600_000, // 2 days ago
        type: "earthquake",
      },
      geometry: {
        coordinates: [81.5, 29.2, 15],
      },
    };

    const alert = _internal.parseUsgsFeature(feature, nowMs, fetchedAt);
    expect(alert).not.toBeNull();
    expect(alert?.severity).toBe("danger"); // M6.2 is danger
    expect(alert?.timeframe).toBe("report");
  });

  it("strictly discards tremors older than 7 days", () => {
    const staleFeature = {
      id: "us7000old",
      properties: {
        mag: 4.8,
        place: "Sindhupalchok",
        time: nowMs - 8 * 86400_000, // 8 days ago
        type: "earthquake",
      },
      geometry: {
        coordinates: [85.7, 27.9, 10],
      },
    };

    const alert = _internal.parseUsgsFeature(staleFeature, nowMs, fetchedAt);
    expect(alert).toBeNull();
  });

  it("filters out non-earthquake events (e.g. quarry blast)", () => {
    const blastFeature = {
      id: "blast123",
      properties: {
        mag: 2.6,
        place: "Quarry area",
        time: nowMs - 3600_000,
        type: "quarry blast",
      },
      geometry: {
        coordinates: [85.0, 27.0, 0],
      },
    };

    const alert = _internal.parseUsgsFeature(blastFeature, nowMs, fetchedAt);
    expect(alert).toBeNull();
  });

  it("handles missing coordinates and null properties gracefully", () => {
    const minimalFeature = {
      id: "min001",
      properties: {
        mag: 3.1,
        time: nowMs - 1800_000,
        type: "earthquake",
      },
    };

    const alert = _internal.parseUsgsFeature(minimalFeature, nowMs, fetchedAt);
    expect(alert).not.toBeNull();
    expect(alert?.location?.lat).toBeUndefined();
    expect(alert?.location?.lng).toBeUndefined();
    expect(alert?.location?.name).toBe("Nepal region");
  });
});
