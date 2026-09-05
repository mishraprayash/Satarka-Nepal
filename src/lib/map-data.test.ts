import { describe, expect, it } from "vitest";
import { _internal as mapData } from "./map-data";

describe("map-data extractLatLng", () => {
  it("parses GeoJSON point coordinates as [lng, lat]", () => {
    expect(mapData.extractLatLng({ point: { coordinates: [85.5, 27.7] } })).toEqual({ lat: 27.7, lng: 85.5 });
  });

  it("falls back to flat latitude/longitude fields", () => {
    expect(mapData.extractLatLng({ latitude: "28.2", longitude: 84.1 })).toEqual({ lat: 28.2, lng: 84.1 });
  });

  it("returns null when coordinates are missing", () => {
    expect(mapData.extractLatLng({})).toBeNull();
    expect(mapData.extractLatLng({ point: { coordinates: "nope" } })).toBeNull();
  });

  it("rejects sentinel no-data readings", () => {
    expect(mapData.extractLatLng({ latitude: -9999, longitude: 84.1 })).toBeNull();
  });
});

describe("map-data static reference data integrity", () => {
  it("has basins, glacial lakes, and seismic features with valid coordinates", async () => {
    const { BASINS } = await import("./map-data/basins");
    const { GLACIAL_LAKES } = await import("./map-data/glacial-lakes");
    const { SEISMIC } = await import("./map-data/seismic");

    expect(BASINS.length).toBeGreaterThanOrEqual(5);
    for (const b of BASINS) {
      expect(b.points.length).toBeGreaterThan(3);
      for (const [lng, lat] of b.points) {
        expect(Number.isFinite(lng)).toBe(true);
        expect(Number.isFinite(lat)).toBe(true);
        expect(lat).toBeGreaterThanOrEqual(26);
        expect(lat).toBeLessThanOrEqual(31);
        expect(lng).toBeGreaterThanOrEqual(79.5);
        expect(lng).toBeLessThanOrEqual(88.5);
      }
    }
    expect(GLACIAL_LAKES.length).toBeGreaterThanOrEqual(5);
    for (const l of GLACIAL_LAKES) {
      expect(Number.isFinite(l.lat)).toBe(true);
      expect(Number.isFinite(l.lng)).toBe(true);
    }
    expect(SEISMIC.length).toBeGreaterThanOrEqual(2);
    for (const f of SEISMIC) {
      expect(f.points.length).toBeGreaterThan(1);
    }
  });
});
