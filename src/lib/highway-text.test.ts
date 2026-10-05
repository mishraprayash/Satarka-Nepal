import { describe, it, expect } from "vitest";
import { localizeClosureReason, localizeRepairEta } from "@/lib/highway-text";

describe("highway text localisation", () => {
  it("leaves English untouched", () => {
    expect(localizeClosureReason("Landslide", "en")).toBe("Landslide");
    expect(localizeRepairEta("3 hours", "en")).toBe("3 hours");
  });
  it("maps common causes to Nepali, most specific first", () => {
    expect(localizeClosureReason("Landslide", "ne")).toBe("पहिरो");
    expect(localizeClosureReason("Debris Flow from uphill", "ne")).toBe("पहाडबाट लेदो/माटो बगेको");
    expect(localizeClosureReason("GLOF flood at Rasuwagadhi", "ne")).toBe("हिमताल विस्फोट बाढी");
  });
  it("falls back to the original text for unknown causes", () => {
    expect(localizeClosureReason("Something odd", "ne")).toBe("Something odd");
  });
  it("converts ETA to Devanagari digits", () => {
    expect(localizeRepairEta("3 hours", "ne")).toBe("३ घण्टा");
    expect(localizeRepairEta("1 days", "ne")).toBe("१ दिन");
    expect(localizeRepairEta("soon", "ne")).toBe("soon");
  });
});
