import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, DELETE } from "./route";

// Mock Supabase server client
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "alerts") {
        return {
          insert: mockInsert,
          delete: () => ({
            eq: (col1: string, val1: string) => ({
              eq: (col2: string, val2: string) => ({
                select: mockSelect,
              }),
            }),
          }),
        };
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
    it("creates a report with 72h default expires_at", async () => {
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
      expect(inserted.expires_at).toBeDefined();

      const issuedTime = new Date(inserted.issued_at).getTime();
      const expiresTime = new Date(inserted.expires_at).getTime();
      // Should expire approximately 72 hours later (~259,200,000 ms)
      expect(expiresTime - issuedTime).toBe(72 * 60 * 60 * 1000);
    });

    it("rejects invalid input", async () => {
      const req = new Request("http://localhost:3000/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hazard: "invalid_hazard",
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
});
