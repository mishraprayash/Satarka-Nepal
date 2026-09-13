import { describe, it, expect } from "vitest";
import type { Alert } from "@/lib/types";
import { deduplicateAlerts, sortAlerts } from "./deduplication";

function makeAlert(partial: Partial<Alert> & { id: string }): Alert {
  return {
    hazard: "flood",
    severity: "warning",
    timeframe: "now",
    title: { en: "Test Alert" },
    location: { lat: 27.7172, lng: 85.324 }, // Kathmandu
    issuedAt: "2026-09-13T12:00:00Z",
    source: {
      id: "test-src",
      name: "Test Source",
      url: "https://example.com",
      status: "live",
      fetchedAt: "2026-09-13T12:00:00Z",
    },
    provenance: "official",
    ...partial,
  };
}

describe("deduplication & sorting domain logic", () => {
  describe("sortAlerts", () => {
    it("orders alerts primarily by severity (danger > warning > watch > advisory > info)", () => {
      const danger = makeAlert({ id: "1", severity: "danger" });
      const warning = makeAlert({ id: "2", severity: "warning" });
      const info = makeAlert({ id: "3", severity: "info" });

      const sorted = [info, danger, warning].sort(sortAlerts);
      expect(sorted.map((a) => a.id)).toEqual(["1", "2", "3"]);
    });

    it("breaks ties within same severity by newest issuedAt first", () => {
      const older = makeAlert({ id: "old", severity: "warning", issuedAt: "2026-09-13T08:00:00Z" });
      const newer = makeAlert({ id: "new", severity: "warning", issuedAt: "2026-09-13T11:00:00Z" });

      const sorted = [older, newer].sort(sortAlerts);
      expect(sorted.map((a) => a.id)).toEqual(["new", "old"]);
    });
  });

  describe("deduplicateAlerts", () => {
    it("preserves higher severity alert when spatial and temporal match occurs", () => {
      // 1.5 km apart in Kathmandu valley, within 2 hours
      const warning = makeAlert({
        id: "warn",
        severity: "warning",
        hazard: "flood",
        location: { lat: 27.7172, lng: 85.324 },
        issuedAt: "2026-09-13T10:00:00Z",
      });
      const danger = makeAlert({
        id: "dang",
        severity: "danger",
        hazard: "flood",
        location: { lat: 27.725, lng: 85.33 },
        issuedAt: "2026-09-13T11:30:00Z",
      });

      const result = deduplicateAlerts([warning, danger]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("dang");
    });

    it("favors higher trust source when severities match", () => {
      // Same coords, same time, same severity, but one is live feed and one is report-only
      const live = makeAlert({
        id: "live-src",
        severity: "warning",
        source: {
          id: "src-live",
          name: "Live Feed",
          url: "https://example.com",
          status: "live",
          fetchedAt: "2026-09-13T12:00:00Z",
        },
      });
      const report = makeAlert({
        id: "report-src",
        severity: "warning",
        source: {
          id: "src-report",
          name: "Report Only",
          url: "https://example.com",
          status: "report-only",
          fetchedAt: "2026-09-13T12:00:00Z",
        },
      });

      const result = deduplicateAlerts([report, live]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("live-src");
    });

    it("does not deduplicate alerts with different hazard types", () => {
      // Same location and time, but one is flood and one is earthquake
      const flood = makeAlert({ id: "flood", hazard: "flood" });
      const quake = makeAlert({ id: "quake", hazard: "earthquake" });

      const result = deduplicateAlerts([flood, quake]);
      expect(result).toHaveLength(2);
    });

    it("does not deduplicate alerts further than 5 km apart", () => {
      // Kathmandu vs Lalitpur south (> 8km apart)
      const a = makeAlert({ id: "a", location: { lat: 27.7172, lng: 85.324 } });
      const b = makeAlert({ id: "b", location: { lat: 27.6, lng: 85.3 } });

      const result = deduplicateAlerts([a, b]);
      expect(result).toHaveLength(2);
    });

    it("does not deduplicate alerts further than 24 hours apart", () => {
      const a = makeAlert({ id: "a", issuedAt: "2026-09-10T12:00:00Z" });
      const b = makeAlert({ id: "b", issuedAt: "2026-09-13T12:00:00Z" });

      const result = deduplicateAlerts([a, b]);
      expect(result).toHaveLength(2);
    });
  });
});
