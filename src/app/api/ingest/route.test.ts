import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

const mockLoadAllAlerts = vi.fn();
const mockLoadHighways = vi.fn();
const mockSyncAlertsToSupabase = vi.fn();
const mockSyncHighwaysToSupabase = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/sources", () => ({
  loadAllAlerts: (...args: unknown[]) => mockLoadAllAlerts(...args),
}));

vi.mock("@/lib/sources/highway", () => ({
  loadHighways: (...args: unknown[]) => mockLoadHighways(...args),
}));

vi.mock("@/lib/supabase/sync", () => ({
  syncAlertsToSupabase: (...args: unknown[]) => mockSyncAlertsToSupabase(...args),
  syncHighwaysToSupabase: (...args: unknown[]) => mockSyncHighwaysToSupabase(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(() => ({
    rpc: mockRpc,
  })),
}));

describe("Ingest API Route (/api/ingest)", () => {
  const origEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...origEnv };
    delete process.env.CRON_SECRET;
    mockRpc.mockResolvedValue({ error: null });
  });

  describe("Authorization & CRON_SECRET", () => {
    it("returns 503 in production if CRON_SECRET is not configured", async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      const req = new Request("http://localhost:3000/api/ingest", { method: "POST" });
      const res = await POST(req);
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toContain("CRON_SECRET must be configured");
    });

    it("rejects unauthorized request when CRON_SECRET is set", async () => {
      process.env.CRON_SECRET = "super-secret-key";
      const req = new Request("http://localhost:3000/api/ingest", {
        method: "POST",
        headers: { authorization: "Bearer wrong-key" },
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("accepts valid Bearer token regardless of case or extra spaces", async () => {
      process.env.CRON_SECRET = "super-secret-key";
      mockLoadAllAlerts.mockResolvedValueOnce({ alerts: [], sources: [] });
      mockLoadHighways.mockResolvedValueOnce([]);
      mockSyncAlertsToSupabase.mockResolvedValueOnce({
        alertsSynced: 0,
        telemetryRecorded: 0,
        staleDeactivated: 0,
      });
      mockSyncHighwaysToSupabase.mockResolvedValueOnce(0);

      const req = new Request("http://localhost:3000/api/ingest", {
        method: "POST",
        headers: { authorization: "bearer   super-secret-key  " },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it("accepts valid secret via x-cron-secret header", async () => {
      process.env.CRON_SECRET = "super-secret-key";
      mockLoadAllAlerts.mockResolvedValueOnce({ alerts: [], sources: [] });
      mockLoadHighways.mockResolvedValueOnce([]);
      mockSyncAlertsToSupabase.mockResolvedValueOnce({
        alertsSynced: 0,
        telemetryRecorded: 0,
        staleDeactivated: 0,
      });
      mockSyncHighwaysToSupabase.mockResolvedValueOnce(0);

      const req = new Request("http://localhost:3000/api/ingest", {
        method: "GET",
        headers: { "x-cron-secret": "super-secret-key" },
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it("accepts valid secret via ?secret= query parameter", async () => {
      process.env.CRON_SECRET = "super-secret-key";
      mockLoadAllAlerts.mockResolvedValueOnce({ alerts: [], sources: [] });
      mockLoadHighways.mockResolvedValueOnce([]);
      mockSyncAlertsToSupabase.mockResolvedValueOnce({
        alertsSynced: 0,
        telemetryRecorded: 0,
        staleDeactivated: 0,
      });
      mockSyncHighwaysToSupabase.mockResolvedValueOnce(0);

      const req = new Request("http://localhost:3000/api/ingest?secret=super-secret-key", {
        method: "POST",
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });
  });

  describe("Failure Isolation & Partial Sync", () => {
    it("isolates highway failure and allows alerts sync to proceed", async () => {
      mockLoadAllAlerts.mockResolvedValueOnce({
        alerts: [{ id: "alert-1" }],
        sources: [{ id: "bipad-river", ok: true }],
      });
      mockLoadHighways.mockRejectedValueOnce(new Error("DOR API Network Timeout"));
      mockSyncAlertsToSupabase.mockResolvedValueOnce({
        alertsSynced: 1,
        telemetryRecorded: 1,
        staleDeactivated: 0,
      });

      const req = new Request("http://localhost:3000/api/ingest", { method: "POST" });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.synced.alerts).toBe(1);
      expect(json.synced.highways).toBe(0);
      expect(json.errors).toBeDefined();
      expect(json.errors.some((e: string) => e.includes("DOR API Network Timeout"))).toBe(true);
      expect(mockSyncAlertsToSupabase).toHaveBeenCalledTimes(1);
    });

    it("isolates alerts failure and allows highways sync to proceed", async () => {
      mockLoadAllAlerts.mockRejectedValueOnce(new Error("BIPAD Gateway Failure"));
      mockLoadHighways.mockResolvedValueOnce([{ id: "hw-1" }]);
      mockSyncHighwaysToSupabase.mockResolvedValueOnce(1);

      const req = new Request("http://localhost:3000/api/ingest", { method: "POST" });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.synced.alerts).toBe(0);
      expect(json.synced.highways).toBe(1);
      expect(json.errors).toBeDefined();
      expect(json.errors.some((e: string) => e.includes("BIPAD Gateway Failure"))).toBe(true);
      expect(mockSyncHighwaysToSupabase).toHaveBeenCalledTimes(1);
    });

    it("returns 502 if all upstreams fail", async () => {
      mockLoadAllAlerts.mockRejectedValueOnce(new Error("Alerts Service Down"));
      mockLoadHighways.mockRejectedValueOnce(new Error("Highways Service Down"));

      const req = new Request("http://localhost:3000/api/ingest", { method: "POST" });
      const res = await POST(req);

      expect(res.status).toBe(502);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.errors.length).toBeGreaterThanOrEqual(2);
    });

    it("safely handles and logs database retention prune RPC failure", async () => {
      mockLoadAllAlerts.mockResolvedValueOnce({ alerts: [], sources: [] });
      mockLoadHighways.mockResolvedValueOnce([]);
      mockSyncAlertsToSupabase.mockResolvedValueOnce({
        alertsSynced: 0,
        telemetryRecorded: 0,
        staleDeactivated: 0,
      });
      mockSyncHighwaysToSupabase.mockResolvedValueOnce(0);
      mockRpc.mockResolvedValueOnce({ error: { message: "Permission denied for function" } });

      const req = new Request("http://localhost:3000/api/ingest", { method: "POST" });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.errors).toBeDefined();
      expect(json.errors.some((e: string) => e.includes("Permission denied"))).toBe(true);
    });
  });
});
