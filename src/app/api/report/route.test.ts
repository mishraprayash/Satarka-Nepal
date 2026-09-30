import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, DELETE } from "./route";
import { GET } from "./list/route";

// Mock Supabase server client
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockIlike = vi.fn();

const mockQueryBuilder: any = {
  insert: mockInsert,
  delete: () => ({
    eq: (col1: string, val1: string) => ({
      eq: (col2: string, val2: string) => ({
        select: mockSelect,
      }),
    }),
  }),
};
mockQueryBuilder.select = vi.fn(() => mockQueryBuilder);
mockQueryBuilder.eq = vi.fn(() => mockQueryBuilder);
mockQueryBuilder.order = vi.fn(() => mockQueryBuilder);
mockQueryBuilder.limit = vi.fn(() => mockQueryBuilder);
mockQueryBuilder.ilike = vi.fn(() => mockQueryBuilder);

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "alerts") {
        return mockQueryBuilder;
      }
      return {};
    },
  })),
}));

describe("Community Report API (/api/report)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/report", () => {
    it("creates a report with 72h default expires_at and correct geom Point", async () => {
      mockInsert.mockResolvedValueOnce({ error: null });

      const req = new Request("http://localhost:3000/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hazard: "flood",
          district: "Kathmandu",
          address: "Balkhu Bridge",
          description: "Water level is rising rapidly near the river bank",
          lat: 27.69,
          lng: 85.3,
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.id).toMatch(/^com-\d+-[a-z0-9]+$/);
      expect(json.expiresAt).toBeDefined();

      const inserted = mockInsert.mock.calls[0][0];
      expect(inserted.hazard).toBe("flood");
      expect(inserted.district).toBe("Kathmandu");
      expect(inserted.provenance).toBe("community");
      expect(inserted.is_active).toBe(true);
      expect(inserted.lat).toBe(27.69);
      expect(inserted.lng).toBe(85.3);
      expect(inserted.geom).toBe("SRID=4326;POINT(85.3 27.69)");
      expect(inserted.title_en).toBe("Community Report: FLOOD in Kathmandu");
      expect(inserted.title_ne).toBe("सामुदायिक रिपोर्ट: काठमाडौंमा बाढी");
      expect(inserted.description_en).toContain("Water level is rising");
      expect(inserted.description_ne).toContain("स्थान: Balkhu Bridge, काठमाडौं");
      expect(inserted.expires_at).toBeDefined();

      const issuedTime = new Date(inserted.issued_at).getTime();
      const expiresTime = new Date(inserted.expires_at).getTime();
      expect(expiresTime - issuedTime).toBe(72 * 60 * 60 * 1000);
    });

    it("handles optional lat/lng safely when coordinates are omitted or null", async () => {
      mockInsert.mockResolvedValueOnce({ error: null });

      const req = new Request("http://localhost:3000/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hazard: "landslide",
          district: "Kaski",
          address: "Sarangkot hill trail",
          description: "Debris blockage across the trekking path",
          lat: null,
          lng: null,
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const inserted = mockInsert.mock.calls[0][0];
      expect(inserted.lat).toBeNull();
      expect(inserted.lng).toBeNull();
      expect(inserted.geom).toBeNull();
      expect(inserted.title_en).toBe("Community Report: LANDSLIDE in Kaski");
      expect(inserted.title_ne).toBe("सामुदायिक रिपोर्ट: कास्कीमा पहिरो");
    });

    it("normalizes lowercase district and parses numeric string coordinates", async () => {
      mockInsert.mockResolvedValueOnce({ error: null });

      const req = new Request("http://localhost:3000/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hazard: "earthquake",
          district: "lalitpur",
          address: "Patan Durbar Square",
          description: "Minor tremors felt across old city streets",
          lat: "27.673",
          lng: "85.325",
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const inserted = mockInsert.mock.calls[0][0];
      expect(inserted.district).toBe("Lalitpur");
      expect(inserted.lat).toBe(27.673);
      expect(inserted.lng).toBe(85.325);
      expect(inserted.geom).toBe("SRID=4326;POINT(85.325 27.673)");
      expect(inserted.title_en).toBe("Community Report: EARTHQUAKE in Lalitpur");
      expect(inserted.title_ne).toBe("सामुदायिक रिपोर्ट: ललितपुरमा भूकम्प");
    });

    it("normalizes Nepali district input correctly", async () => {
      mockInsert.mockResolvedValueOnce({ error: null });

      const req = new Request("http://localhost:3000/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hazard: "glof",
          district: "सोलुखुम्बु",
          address: "इम्जा ताल छेउ",
          description: "तालको पानीको सतह बढेको छ",
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const inserted = mockInsert.mock.calls[0][0];
      expect(inserted.district).toBe("Solukhumbu");
      expect(inserted.title_en).toBe("Community Report: GLOF in Solukhumbu");
      expect(inserted.title_ne).toBe("सामुदायिक रिपोर्ट: सोलुखुम्बुमा ग्लोफ");
    });

    it("sanitizes HTML tags and dangerous characters in address and description", async () => {
      mockInsert.mockResolvedValueOnce({ error: null });

      const req = new Request("http://localhost:3000/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hazard: "flood",
          district: "Chitwan",
          address: "<script>alert('xss')</script> Narayani River Bank",
          description: "<b>Dangerous rise</b> in water levels observed near settlement.",
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const inserted = mockInsert.mock.calls[0][0];
      expect(inserted.location_name).not.toContain("<script>");
      expect(inserted.location_name).toBe("alert('xss') Narayani River Bank");
      expect(inserted.description_en).not.toContain("<b>");
      expect(inserted.description_en).toContain("Dangerous rise in water levels");
    });

    it("rejects incomplete coordinates where only lat is provided", async () => {
      const req = new Request("http://localhost:3000/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hazard: "flood",
          district: "Kathmandu",
          address: "Balkhu",
          description: "Water level is rising",
          lat: 27.69,
          lng: null,
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Invalid data");
      expect(json.details.some((d: any) => d.message.includes("Both latitude and longitude"))).toBe(true);
    });

    it("rejects out-of-bounds latitude and longitude", async () => {
      const req = new Request("http://localhost:3000/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hazard: "flood",
          district: "Kathmandu",
          address: "Balkhu",
          description: "Water level is rising",
          lat: 95.0, // Out of bounds (-90 to 90)
          lng: 85.3,
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.details.some((d: any) => d.message.includes("Latitude must be between -90 and 90"))).toBe(true);
    });

    it("rejects non-numeric string coordinates", async () => {
      const req = new Request("http://localhost:3000/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hazard: "flood",
          district: "Kathmandu",
          address: "Balkhu",
          description: "Water level is rising",
          lat: "not-a-number",
          lng: 85.3,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("rejects invalid hazard type", async () => {
      const req = new Request("http://localhost:3000/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hazard: "meteor_strike",
          district: "Kathmandu",
          address: "Thamel",
          description: "Unexpected event",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("rejects whitespace-only descriptions", async () => {
      const req = new Request("http://localhost:3000/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hazard: "flood",
          district: "Kathmandu",
          address: "Balkhu",
          description: "    ",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/report", () => {
    it("deletes a community report by ID", async () => {
      mockSelect.mockResolvedValueOnce({ data: [{ id: "com-12345" }], error: null });

      const req = new Request("http://localhost:3000/api/report?id=com-12345", {
        method: "DELETE",
      });

      const res = await DELETE(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.deletedId).toBe("com-12345");
    });

    it("returns 400 if no report ID is provided", async () => {
      const req = new Request("http://localhost:3000/api/report", {
        method: "DELETE",
      });

      const res = await DELETE(req);
      expect(res.status).toBe(400);
    });

    it("returns 404 if report was not found or not a community report", async () => {
      mockSelect.mockResolvedValueOnce({ data: [], error: null });

      const req = new Request("http://localhost:3000/api/report?id=com-nonexistent", {
        method: "DELETE",
      });

      const res = await DELETE(req);
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/report/list", () => {
    it("lists community reports ordered by issued_at", async () => {
      mockQueryBuilder.then = vi.fn().mockImplementation((onFulfilled) => {
        return Promise.resolve(onFulfilled({
          data: [
            {
              id: "com-1",
              hazard: "flood",
              district: "Kathmandu",
              is_active: true,
              issued_at: new Date().toISOString(),
            },
          ],
          error: null,
        }));
      });

      const req = new Request("http://localhost:3000/api/report/list");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(json.reports)).toBe(true);
      expect(json.reports.length).toBe(1);
      expect(json.reports[0].id).toBe("com-1");
    });
  });
});
