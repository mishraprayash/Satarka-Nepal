import { describe, expect, it } from "vitest";
import { _internal } from "./gdacs";

describe("gdacs _internal helpers", () => {
  const nowMs = Date.parse("2026-09-13T12:00:00.000Z");
  const fetchedAt = "2026-09-13T12:00:00.000Z";

  describe("alertLevelToSeverity", () => {
    it("maps red, orange, green to standard severity", () => {
      expect(_internal.alertLevelToSeverity("Red")).toBe("danger");
      expect(_internal.alertLevelToSeverity("Orange")).toBe("warning");
      expect(_internal.alertLevelToSeverity("Green")).toBe("advisory");
      expect(_internal.alertLevelToSeverity("Unknown")).toBeNull();
      expect(_internal.alertLevelToSeverity(null)).toBeNull();
    });
  });

  describe("isNepal", () => {
    it("matches NPL iso code or country name", () => {
      expect(_internal.isNepal({ iso3: "NPL" }, null, null)).toBe(true);
      expect(_internal.isNepal({ country: "Nepal" }, null, null)).toBe(true);
      expect(_internal.isNepal({ country: "India" }, null, null)).toBe(false);
    });

    it("matches coordinates inside Nepal bounding box", () => {
      // Kathmandu: lat 27.7, lng 85.3
      expect(_internal.isNepal({}, 27.7, 85.3)).toBe(true);
      // London: lat 51.5, lng -0.1
      expect(_internal.isNepal({}, 51.5, -0.1)).toBe(false);
    });
  });

  describe("parseGdacsFeature", () => {
    it("parses active flood event in Nepal", () => {
      const activeFeature = {
        properties: {
          eventid: "1001",
          eventtype: "FL",
          iso3: "NPL",
          alertlevel: "Red",
          name: "Flood in Koshi Basin",
          fromdate: new Date(nowMs - 6 * 3600_000).toISOString(),
          todate: new Date(nowMs + 24 * 3600_000).toISOString(), // ongoing
        },
        geometry: {
          coordinates: [87.1, 26.8],
        },
      };

      const alert = _internal.parseGdacsFeature(activeFeature, nowMs, fetchedAt);
      expect(alert).not.toBeNull();
      expect(alert?.id).toBe("gdacs-1001");
      expect(alert?.hazard).toBe("flood");
      expect(alert?.severity).toBe("danger");
      expect(alert?.timeframe).toBe("now");
      expect(alert?.title.en).toBe("Flood in Koshi Basin");
    });

    it("discards expired flood events whose todate is in the past", () => {
      const expiredFeature = {
        properties: {
          eventid: "1002",
          eventtype: "FL",
          iso3: "NPL",
          alertlevel: "Orange",
          name: "Past Flood",
          fromdate: new Date(nowMs - 14 * 86400_000).toISOString(),
          todate: new Date(nowMs - 3 * 86400_000).toISOString(), // ended 3 days ago
        },
      };

      expect(_internal.parseGdacsFeature(expiredFeature, nowMs, fetchedAt)).toBeNull();
    });

    it("discards flood events with fromdate older than 7 days when no todate is provided", () => {
      const oldFeature = {
        properties: {
          eventid: "1003",
          eventtype: "FL",
          iso3: "NPL",
          alertlevel: "Red",
          fromdate: new Date(nowMs - 10 * 86400_000).toISOString(), // 10 days ago
        },
      };

      expect(_internal.parseGdacsFeature(oldFeature, nowMs, fetchedAt)).toBeNull();
    });

    it("ignores non-flood GDACS events (e.g. earthquakes)", () => {
      const eqFeature = {
        properties: {
          eventid: "1004",
          eventtype: "EQ",
          iso3: "NPL",
          alertlevel: "Red",
        },
      };

      expect(_internal.parseGdacsFeature(eqFeature, nowMs, fetchedAt)).toBeNull();
    });
  });
});
