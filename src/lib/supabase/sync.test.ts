import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncAlertsToSupabase, syncHighwaysToSupabase } from "./sync";
import type { Alert, HighwayBlockage, SourceHealth } from "@/lib/types";

const mockUpsert = vi.fn();
const mockTelemetryUpsert = vi.fn();
const mockRpc = vi.fn();

vi.mock("./server", () => ({
  getSupabaseAdminClient: vi.fn(() => ({
    rpc: mockRpc,
    from: (table: string) => {
      if (table === "alerts") {
        return {
          upsert: mockUpsert,
        };
      }
      if (table === "highway_blockages") {
        return {
          upsert: mockUpsert,
        };
      }
      if (table === "river_telemetry_history") {
        return {
          upsert: mockTelemetryUpsert,
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
    mockTelemetryUpsert.mockResolvedValue({ error: null });
    mockRpc.mockResolvedValue({ data: 0, error: null });
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
      expect(mockTelemetryUpsert).toHaveBeenCalledWith(
        expect.any(Array),
        { onConflict: "station_id,measured_at", ignoreDuplicates: true },
      );
    });

    it("deactivates stale alerts for healthy sources in a single RPC", async () => {
      mockRpc.mockResolvedValueOnce({ data: 1, error: null });

      const res = await syncAlertsToSupabase([sampleAlert], [sampleSource]);

      expect(res?.staleDeactivated).toBe(1);
      expect(mockRpc).toHaveBeenCalledTimes(1);
      expect(mockRpc).toHaveBeenCalledWith("deactivate_stale_alerts", {
        p_source_ids: ["bipad-river"],
        p_active_ids: ["alert-1"],
      });
    });

    it("does NOT deactivate alerts if upstream source failed (ok = false)", async () => {
      const failedSource: SourceHealth = {
        ...sampleSource,
        ok: false,
        error: "Connection timed out",
      };

      const res = await syncAlertsToSupabase([], [failedSource]);

      expect(res?.staleDeactivated).toBe(0);
      expect(mockRpc).not.toHaveBeenCalled();
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
