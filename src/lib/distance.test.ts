import { describe, expect, it } from "vitest";
import { haversineKm, withinKm } from "./distance";

describe("haversineKm", () => {
  it("returns ~0 for identical points", () => {
    expect(haversineKm({ lat: 27.7, lng: 85.3 }, { lat: 27.7, lng: 85.3 })).toBeLessThan(0.001);
  });

  it("computes a known distance (Kathmandu → Pokhara ≈ 140–145 km)", () => {
    const km = haversineKm({ lat: 27.7172, lng: 85.324 }, { lat: 28.2096, lng: 83.9856 });
    expect(km).toBeGreaterThan(130);
    expect(km).toBeLessThan(160);
  });

  it("is symmetric", () => {
    const a = { lat: 26.9, lng: 87.2 };
    const b = { lat: 29.5, lng: 81.1 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
  });
});

describe("withinKm", () => {
  it("is true inside the radius and false outside", () => {
    const center = { lat: 27.7, lng: 85.3 };
    // ~0.08° of latitude ≈ 8.9 km (inside); 0.3° ≈ 33 km (outside).
    expect(withinKm(center, { lat: 27.78, lng: 85.3 }, 10)).toBe(true);
    expect(withinKm(center, { lat: 28.0, lng: 85.3 }, 10)).toBe(false);
  });
});
