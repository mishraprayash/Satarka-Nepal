import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

const mockGetCoordinatesWeather = vi.fn();

vi.mock("@/lib/sources/open-meteo", () => ({
  getCoordinatesWeather: (...args: unknown[]) => mockGetCoordinatesWeather(...args),
}));

describe("Weather API Route (/api/weather)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("District Parameter Validation", () => {
    it("returns 400 if district parameter is overly long", async () => {
      const longDistrict = "a".repeat(65);
      const req = new NextRequest(`http://localhost:3000/api/weather?district=${longDistrict}`);
      const res = await GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("District parameter too long");
    });

    it("returns 404 if district is not in Nepal's 77 districts", async () => {
      const req = new NextRequest("http://localhost:3000/api/weather?district=nonexistent-district");
      const res = await GET(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toContain("District 'nonexistent-district' not found");
    });

    it("returns 502 if upstream weather service fails for a valid district", async () => {
      mockGetCoordinatesWeather.mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost:3000/api/weather?district=kathmandu");
      const res = await GET(req);
      expect(res.status).toBe(502);
      const json = await res.json();
      expect(json.error).toContain("Weather data temporarily unavailable for district 'Kathmandu'");
    });

    it("returns 200 with cache headers when weather succeeds for valid district", async () => {
      const mockWeather = {
        districtId: "kathmandu",
        temperature: 22.5,
        humidity: 65,
        weatherCode: 1,
        windSpeed: 5,
        observedAt: "2026-09-30T10:00:00Z",
      };
      mockGetCoordinatesWeather.mockResolvedValueOnce(mockWeather);

      const req = new NextRequest("http://localhost:3000/api/weather?district=kathmandu");
      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toContain("public, s-maxage=900");
      const json = await res.json();
      expect(json.districtId).toBe("kathmandu");
      expect(json.temperature).toBe(22.5);
    });
  });

  describe("Coordinate Parameter Validation", () => {
    it("returns 400 if lat is provided without lng", async () => {
      const req = new NextRequest("http://localhost:3000/api/weather?lat=27.7172");
      const res = await GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Both 'lat' and 'lng' query parameters are required");
    });

    it("returns 400 if lng is provided without lat", async () => {
      const req = new NextRequest("http://localhost:3000/api/weather?lng=85.3240");
      const res = await GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Both 'lat' and 'lng' query parameters are required");
    });

    it("returns 400 for out-of-range coordinates", async () => {
      const req = new NextRequest("http://localhost:3000/api/weather?lat=95&lng=85.3240");
      const res = await GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Invalid coordinates");
    });

    it("returns 400 for non-numeric coordinates", async () => {
      const req = new NextRequest("http://localhost:3000/api/weather?lat=abc&lng=xyz");
      const res = await GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Invalid coordinates");
    });

    it("returns 502 if upstream weather service fails for coordinates", async () => {
      mockGetCoordinatesWeather.mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost:3000/api/weather?lat=27.7&lng=85.3");
      const res = await GET(req);
      expect(res.status).toBe(502);
      const json = await res.json();
      expect(json.error).toContain("Weather data temporarily unavailable for coordinates");
    });

    it("returns 200 with cache headers for valid coordinates", async () => {
      const mockWeather = {
        districtId: "custom",
        temperature: 18.0,
        humidity: 70,
        weatherCode: 0,
        windSpeed: 3,
        observedAt: "2026-09-30T10:00:00Z",
      };
      mockGetCoordinatesWeather.mockResolvedValueOnce(mockWeather);

      const req = new NextRequest("http://localhost:3000/api/weather?lat=27.7&lng=85.3");
      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toContain("public, s-maxage=900");
      const json = await res.json();
      expect(json.temperature).toBe(18.0);
    });
  });

  describe("Missing Parameters", () => {
    it("returns 400 if neither district nor coordinates are provided", async () => {
      const req = new NextRequest("http://localhost:3000/api/weather");
      const res = await GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Missing district or lat/lng query parameters");
    });
  });
});
