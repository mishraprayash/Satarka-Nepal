import { describe, it, expect } from "vitest";
import { timeAgo, formatDateTime, formatNumber, localizeText } from "./format";

describe("format utilities", () => {
  describe("timeAgo", () => {
    const fixedNow = 1726236000000; // Reference timestamp

    it("formats relative seconds and minutes in English", () => {
      const tenSecAgo = new Date(fixedNow - 10_000).toISOString();
      expect(timeAgo(tenSecAgo, "en", fixedNow)).toContain("second");

      const fiveMinAgo = new Date(fixedNow - 5 * 60_000).toISOString();
      expect(timeAgo(fiveMinAgo, "en", fixedNow)).toBe("5 minutes ago");
    });

    it("formats relative hours and days", () => {
      const twoHoursAgo = new Date(fixedNow - 2 * 3600_000).toISOString();
      expect(timeAgo(twoHoursAgo, "en", fixedNow)).toBe("2 hours ago");

      const threeDaysAgo = new Date(fixedNow - 3 * 86400_000).toISOString();
      expect(timeAgo(threeDaysAgo, "en", fixedNow)).toBe("3 days ago");
    });

    it("formats in Nepali locale gracefully", () => {
      const fiveMinAgo = new Date(fixedNow - 5 * 60_000).toISOString();
      const neFormatted = timeAgo(fiveMinAgo, "ne", fixedNow);
      expect(neFormatted).toBeTruthy();
      expect(typeof neFormatted).toBe("string");
    });

    it("handles null, undefined, or invalid ISO strings without throwing", () => {
      expect(timeAgo(null, "en")).toBe("unknown");
      expect(timeAgo(undefined, "ne")).toBe("थाहा छैन");
      expect(timeAgo("not-a-date", "en")).toBe("unknown");
    });
  });

  describe("formatDateTime", () => {
    it("formats valid date-time string in English and Nepali", () => {
      const iso = "2026-09-13T12:30:00Z";
      const en = formatDateTime(iso, "en");
      expect(en).toContain("2026");

      const ne = formatDateTime(iso, "ne");
      expect(ne).toBeTruthy();
    });

    it("handles null/invalid date-time strings safely", () => {
      expect(formatDateTime(null, "en")).toBe("");
      expect(formatDateTime("invalid-date", "ne")).toBe("");
    });
  });

  describe("formatNumber", () => {
    it("formats numbers in English", () => {
      expect(formatNumber(1250.5, "en")).toBe("1,250.5");
    });

    it("formats numbers in Nepali with Devanagari numerals", () => {
      const ne = formatNumber(1250, "ne");
      // Nepali Intl uses Devanagari numerals १२५०
      expect(ne).toMatch(/[०-९]/);
    });
  });

  describe("localizeText", () => {
    it("returns Nepali translation when requested and present", () => {
      const val = { en: "Flood Warning", ne: "बाढीको चेतावनी" };
      expect(localizeText(val, "ne")).toBe("बाढीको चेतावनी");
      expect(localizeText(val, "en")).toBe("Flood Warning");
    });

    it("falls back to English when Nepali translation is missing", () => {
      const val = { en: "Landslide Risk" };
      expect(localizeText(val, "ne")).toBe("Landslide Risk");
      expect(localizeText(val, "en")).toBe("Landslide Risk");
    });

    it("handles null or undefined input safely", () => {
      expect(localizeText(null, "en")).toBe("");
      expect(localizeText(undefined, "ne")).toBe("");
    });
  });
});
