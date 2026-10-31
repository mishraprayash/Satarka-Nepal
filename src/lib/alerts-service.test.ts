import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Alert, AlertsResponse } from "@/lib/types";

const mockGetAlertsFromDb = vi.fn();
const mockGetCommunity = vi.fn();
const mockLoadAll = vi.fn();

vi.mock("@/lib/supabase/server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/supabase/server")>(
    "@/lib/supabase/server",
  );
  return {
    isSnapshotFresh: actual.isSnapshotFresh,
    getAlertsFromDb: () => mockGetAlertsFromDb(),
    getCommunityAlertsFromDb: () => mockGetCommunity(),
  };
});

vi.mock("@/lib/sources", () => ({
  loadAllAlerts: (fresh: boolean) => mockLoadAll(fresh),
}));

import { getAlerts } from "./alerts-service";

function alert(id: string, provenance: "official" | "community" = "official"): Alert {
  return {
    id,
    hazard: "flood",
    severity: "advisory",
    timeframe: "now",
    title: { en: id },
    issuedAt: new Date().toISOString(),
    provenance,
    source: { id: "s", name: "s", url: "", status: "live", fetchedAt: new Date().toISOString() },
  } as Alert;
}

function snapshot(generatedAt: string, alerts: Alert[]): AlertsResponse {
  return { generatedAt, sources: [], alerts };
}

describe("getAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCommunity.mockResolvedValue([]);
    mockLoadAll.mockResolvedValue(snapshot(new Date().toISOString(), [alert("up-1")]));
  });

  it("serves a recent Supabase snapshot without touching upstream", async () => {
    mockGetAlertsFromDb.mockResolvedValue(snapshot(new Date().toISOString(), [alert("db-1")]));

    const { data, origin } = await getAlerts();

    expect(origin).toBe("supabase");
    expect(data.alerts.map((a) => a.id)).toEqual(["db-1"]);
    expect(mockLoadAll).not.toHaveBeenCalled();
  });

  it("falls back to upstream when the snapshot is older than the max age", async () => {
    const old = new Date(Date.now() - 2 * 60 * 60_000).toISOString();
    mockGetAlertsFromDb.mockResolvedValue(snapshot(old, [alert("db-1")]));

    const { data, origin } = await getAlerts();

    expect(origin).toBe("upstream");
    expect(data.alerts.map((a) => a.id)).toEqual(["up-1"]);
  });

  it("merges active community reports into the upstream fallback", async () => {
    mockGetAlertsFromDb.mockResolvedValue(null);
    mockGetCommunity.mockResolvedValue([alert("com-1", "community")]);

    const { data } = await getAlerts();

    expect(data.alerts.map((a) => a.id).sort()).toEqual(["com-1", "up-1"]);
  });

  it("skips the database entirely when fresh is requested", async () => {
    const { origin } = await getAlerts({ fresh: true });

    expect(origin).toBe("upstream");
    expect(mockGetAlertsFromDb).not.toHaveBeenCalled();
    expect(mockLoadAll).toHaveBeenCalledWith(true);
  });
});
