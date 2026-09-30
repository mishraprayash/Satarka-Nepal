import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncAlertsToSupabase, syncHighwaysToSupabase } from "./sync";
import type { Alert, HighwayBlockage, SourceHealth } from "@/lib/types";

const mockUpsert = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockIn = vi.fn();

vi.mock("./server", () => ({
  getSupabaseServerClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === "alerts") {
        return {
          upsert: mockUpsert,
          select: (fields: string) => ({
            eq: (col1: string, val1: string) => ({
              eq: (col2: string, val2: boolean) => ({
                eq: (col3: string, val3: string) => mockSelect(fields, val1, val2, val3),
              }),
            }),
          }),
          update: (...args: unknown[]) => {
            mockUpdate(...args);
            return {
              in: mockIn,
            };
          },
        };
      }
      if (table === "highway_blockages") {
        return {
          upsert: mockUpsert,
        };
      }
      if (table === "river_telemetry_history") {
        return {
          insert: mockInsert,
        };
      }
      if (table === "source_health") {
        return {
          upsert: mockUpsert,
        };
      }
      return {};
    },
  })),
}));

describe("Supabase Synchronization Engine (sync.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
    mockInsert.mockResolvedValue({ error: null });
    mockSelect.mockResolvedValue({ data: [], error: null });
    mockIn.mockResolvedValue({ error: null });
  });

  const sampleAlert: Alert = {
    id: "alert-1",
    hazard: "flood",
    severity: "danger",
    timeframe: "now",
    title: { en: "Test Flood Gauge" },
    issuedAt: "2026-09-30T10:00:00Z",
    source: {
      id: "bipad-river",
      name: "BIPAD River",
      url: "https://bipad.gov.np",
      status: "live",
      fetchedAt: "2026-09-30T10:00:00Z",
    },
    provenance: "official",
    location: {
      lat: 27.7,
      lng: 85.3,
      basin: "Bagmati",
    },
    meta: {
      waterLevel: 5.8,
      warningLevel: 4.5,
      dangerLevel: 5.5,
      trend: "RISING",
    },
  };

  const sampleSource: SourceHealth = {
    id: "bipad-river",
    name: "BIPAD River",
    url: "https://bipad.gov.np",
    status: "live",
    timeframe: "now",
    hazards: ["flood"],
    ok: true,
    fetchedAt: "2026-09-30T10:00:00Z",
    surfaced: 1,
  };

  describe("syncAlertsToSupabase", () => {
    it("upserts active alerts and records telemetry for flood hazards", async () => {
      const res = await syncAlertsToSupabase([sampleAlert], [sampleSource]);

      expect(res).not.toBeNull();
      expect(res?.alertsSynced).toBe(1);
      expect(res?.telemetryRecorded).toBe(1);
      expect(res?.staleDeactivated).toBe(0);

      expect(mockUpsert).toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalled();
    });

    it("transitions stale alerts to is_active = false for healthy sources", async () => {
      // Simulate DB having alert-old from bipad-river that is no longer in current alerts
      mockSelect.mockResolvedValueOnce({
        data: [{ id: "alert-old-1" }, { id: "alert-1" }],
        error: null,
      });

      const res = await syncAlertsToSupabase([sampleAlert], [sampleSource]);

      expect(res?.staleDeactivated).toBe(1);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false }),
      );
      expect(mockIn).toHaveBeenCalledWith("id", ["alert-old-1"]);
    });

    it("does NOT deactivate alerts if upstream source failed (ok = false)", async () => {
      const failedSource: SourceHealth = {
        ...sampleSource,
        ok: false,
        error: "Connection timed out",
      };

      const res = await syncAlertsToSupabase([], [failedSource]);

      expect(res?.staleDeactivated).toBe(0);
      expect(mockSelect).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("accurately reports counts when batch upsert fails", async () => {
      mockUpsert.mockResolvedValueOnce({
        error: { message: "Database connection closed", details: "TCP drop" },
      });

      const res = await syncAlertsToSupabase([sampleAlert], [sampleSource]);

      expect(res?.alertsSynced).toBe(0);
    });
  });

  describe("syncHighwaysToSupabase", () => {
    const sampleHighway: HighwayBlockage = {
      id: "dor-hw-1",
      roadRefno: "H01",
      title: "Prithvi Highway",
      location: "Jogimara",
      status: "CLOSED",
      closureReason: "Landslide",
      images: [],
    };

    it("maps CLOSED status to BLOCKED and returns synced count", async () => {
      const count = await syncHighwaysToSupabase([sampleHighway]);

      expect(count).toBe(1);
      const insertedBatch = mockUpsert.mock.calls[0][0];
      expect(insertedBatch[0].status).toBe("BLOCKED");
    });

    it("returns 0 for empty array without DB calls", async () => {
      const count = await syncHighwaysToSupabase([]);
      expect(count).toBe(0);
      expect(mockUpsert).not.toHaveBeenCalled();
    });
  });
});
