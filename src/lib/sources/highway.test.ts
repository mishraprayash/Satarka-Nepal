import { describe, expect, it } from "vitest";
import { _internal as highway } from "./highway";

describe("highway parseHighwayStatus", () => {
  it("detects blocked and closed statuses", () => {
    expect(highway.parseHighwayStatus("BLOCKED")).toBe("BLOCKED");
    expect(highway.parseHighwayStatus("ROAD CLOSED")).toBe("BLOCKED");
    expect(highway.parseHighwayStatus("closed")).toBe("BLOCKED");
  });

  it("detects partial and one-way statuses", () => {
    expect(highway.parseHighwayStatus("PARTIAL_OPEN")).toBe("PARTIAL_OPEN");
    expect(highway.parseHighwayStatus("one_way")).toBe("PARTIAL_OPEN");
    expect(highway.parseHighwayStatus("ONE WAY")).toBe("PARTIAL_OPEN");
  });

  it("defaults to OPEN for clear or unknown values", () => {
    expect(highway.parseHighwayStatus("OPEN")).toBe("OPEN");
    expect(highway.parseHighwayStatus("")).toBe("OPEN");
    expect(highway.parseHighwayStatus(null)).toBe("OPEN");
  });
});

describe("highway parseImages", () => {
  it("extracts valid HTTP image URLs", () => {
    const urls = [
      "https://navigate.dor.gov.np/api/uploads/images/photo1.jpg",
      "https://navigate.dor.gov.np/api/uploads/images/photo2.jpg",
      "invalid-path",
    ];
    expect(highway.parseImages(urls)).toEqual([
      "https://navigate.dor.gov.np/api/uploads/images/photo1.jpg",
      "https://navigate.dor.gov.np/api/uploads/images/photo2.jpg",
    ]);
  });

  it("handles null or non-array values safely", () => {
    expect(highway.parseImages(null)).toEqual([]);
    expect(highway.parseImages(undefined)).toEqual([]);
    expect(highway.parseImages("not-an-array")).toEqual([]);
  });
});
