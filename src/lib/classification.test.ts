import { describe, it, expect } from "vitest";
import {
  classifyHazard,
  magnitudeToSeverity,
  riverLevelToSeverity,
  statusStringToSeverity,
} from "./classification";

describe("classification & severity domain logic", () => {
  describe("classifyHazard", () => {
    it("identifies flood hazards from English and Nepali texts", () => {
      expect(classifyHazard("Severe flash flood warning in Koshi basin")).toBe("flood");
      expect(classifyHazard("नारायणी नदीमा भीषण बाढीको सम्भावना")).toBe("flood");
      expect(classifyHazard("Heavy rainfall recorded at station")).toBe("flood");
      expect(classifyHazard("कास्कीमा भारी वर्षा")).toBe("flood");
    });

    it("identifies landslide and rockfall hazards", () => {
      expect(classifyHazard("Landslide blocking highway section")).toBe("landslide");
      expect(classifyHazard("पृथ्वी राजमार्गमा ठूलो पहिरो खसेर सडक बन्द")).toBe("landslide");
      expect(classifyHazard("Debris flow observed on mountain slope")).toBe("landslide");
    });

    it("identifies earthquake hazards", () => {
      expect(classifyHazard("Earthquake epicenter in Bajhang")).toBe("earthquake");
      expect(classifyHazard("जाजरकोटमा ५.२ म्याग्निच्युडको भूकम्प")).toBe("earthquake");
    });

    it("identifies GLOF hazards", () => {
      expect(classifyHazard("Glacial lake outburst flood warning")).toBe("glof");
      expect(classifyHazard("चो रोल्पा हिमताल जोखिम")).toBe("glof");
    });

    it("strictly rejects unsupported incidents like fire, accidents, epidemics", () => {
      expect(classifyHazard("Residential building fire incident")).toBeNull();
      expect(classifyHazard("जंगलमा भीषण डढेलो र आगलागी")).toBeNull();
      expect(classifyHazard("Road bus collision")).toBeNull();
    });
  });

  describe("magnitudeToSeverity", () => {
    it("maps earthquake magnitudes to appropriate severity levels", () => {
      expect(magnitudeToSeverity(null)).toBe("info");
      expect(magnitudeToSeverity(2.5)).toBe("info");
      expect(magnitudeToSeverity(3.8)).toBe("advisory");
      expect(magnitudeToSeverity(4.5)).toBe("watch");
      expect(magnitudeToSeverity(5.4)).toBe("warning");
      expect(magnitudeToSeverity(6.8)).toBe("danger");
    });
  });

  describe("riverLevelToSeverity", () => {
    it("determines severity based on gauge thresholds", () => {
      expect(riverLevelToSeverity(null, 5.0, 7.0)).toBeNull();
      expect(riverLevelToSeverity(4.2, 5.0, 7.0)).toBe("info");
      expect(riverLevelToSeverity(5.5, 5.0, 7.0)).toBe("warning");
      expect(riverLevelToSeverity(7.2, 5.0, 7.0)).toBe("danger");
    });

    it("handles missing danger threshold gracefully", () => {
      expect(riverLevelToSeverity(6.0, 5.0, null)).toBe("warning");
      expect(riverLevelToSeverity(3.0, 5.0, null)).toBe("info");
    });
  });

  describe("statusStringToSeverity", () => {
    it("parses upstream free-text status strings", () => {
      expect(statusStringToSeverity("Danger")).toBe("danger");
      expect(statusStringToSeverity("Above Danger Level")).toBe("danger");
      expect(statusStringToSeverity("Warning Level")).toBe("warning");
      expect(statusStringToSeverity("Above Warning Level")).toBe("warning");
      expect(statusStringToSeverity("Below Warning Level")).toBe("info");
      expect(statusStringToSeverity(null)).toBeNull();
      expect(statusStringToSeverity("Unknown")).toBeNull();
    });
  });
});
