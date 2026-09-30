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

describe("mapDataToGeoJson", () => {
  it("converts map data to valid RFC 7946 GeoJSON FeatureCollection", async () => {
    const { mapDataToGeoJson } = await import("./map-data");
    const sampleData = {
      generatedAt: new Date().toISOString(),
      basins: [
        {
          id: "koshi",
          name: "Koshi",
          nameNe: "कोशी",
          risk: "high" as const,
          points: [
            [85.0, 27.0],
            [86.0, 27.0],
            [86.0, 28.0],
            [85.0, 27.0],
          ] as [number, number][],
        },
      ],
      glacialLakes: [
        {
          id: "tsho-rolpa",
          name: "Tsho Rolpa",
          district: "Dolakha",
          lat: 27.85,
          lng: 86.47,
          risk: "high" as const,
        },
      ],
      seismic: [
        {
          id: "mft",
          name: "Main Frontal Thrust",
          kind: "thrust" as const,
          note: { en: "Main Frontal Thrust" },
          points: [
            [80.0, 28.0],
            [85.0, 27.0],
          ] as [number, number][],
        },
      ],
      rivers: [
        {
          id: "gauge-1",
          station: "Chatara",
          lat: 26.8,
          lng: 87.1,
          atDanger: true,
          atWarning: false,
        },
        {
          id: "gauge-invalid",
          station: "Invalid Station",
          lat: NaN,
          lng: undefined,
          atDanger: false,
          atWarning: false,
        },
      ],
      quakes: [
        {
          id: "quake-1",
          place: "Gorkha",
          lat: 28.1,
          lng: 84.7,
          mag: 7.8,
          depthKm: 15,
        },
      ],
      highways: [
        {
          id: "hw-1",
          title: "BP Highway",
          roadRefno: "H06",
          location: "Nepalthok",
          lat: 27.4,
          lng: 85.9,
          status: "BLOCKED" as const,
          closureReason: "Landslide",
          images: [],
        },
      ],
      riverOk: true,
      quakeOk: true,
      highwayOk: true,
      errors: [],
    };

    const geojson = mapDataToGeoJson(sampleData);
    expect(geojson.type).toBe("FeatureCollection");
    expect(geojson.features.length).toBe(6); // 1 basin, 1 lake, 1 thrust, 1 river (valid), 1 quake, 1 highway

    // Check invalid river is excluded
    const invalidRiver = geojson.features.find((f) => f.id === "gauge-invalid");
    expect(invalidRiver).toBeUndefined();

    // Check valid river
    const validRiver = geojson.features.find((f) => f.id === "gauge-1");
    expect(validRiver).toBeDefined();
    expect(validRiver?.geometry.type).toBe("Point");
    expect(validRiver?.geometry.coordinates).toEqual([87.1, 26.8]); // [lng, lat]
    expect(validRiver?.properties.layer).toBe("rivers");
    expect(validRiver?.properties.hazard).toBe("flood");

    // Check highway blockage
    const highway = geojson.features.find((f) => f.id === "hw-1");
    expect(highway).toBeDefined();
    expect(highway?.geometry.type).toBe("Point");
    expect(highway?.geometry.coordinates).toEqual([85.9, 27.4]);
    expect(highway?.properties.status).toBe("BLOCKED");

    // Check layer filter
    const riverOnly = mapDataToGeoJson(sampleData, "rivers");
    expect(riverOnly.features.length).toBe(1);
    expect(riverOnly.features[0].id).toBe("gauge-1");
  });
});
