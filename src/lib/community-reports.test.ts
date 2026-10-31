import { describe, it, expect } from "vitest";
import { communityRowToAlert, filterCommunityReports } from "./community-reports";

const NOW = Date.parse("2026-10-31T12:00:00Z");

const rows = [
  {
    id: "com-1",
    hazard: "flood",
    severity: "advisory",
    district: "Kathmandu",
    location_name: "Balkhu Bridge",
    title_en: "Community Report: FLOOD in Kathmandu",
    description_en: "River rising",
    issued_at: "2026-10-31T10:00:00Z",
    lat: 27.69,
    lng: 85.3,
  },
  {
    id: "com-2",
    hazard: "LANDSLIDE",
    severity: "bogus",
    district: "Kaski",
    issued_at: "2026-10-20T10:00:00Z",
    lat: 0,
    lng: 0,
  },
];

const all = { hazard: "all", severity: "all", date: "all", query: "" };

describe("communityRowToAlert", () => {
  it("normalises hazard and severity and drops 0,0 coordinates", () => {
    const a = communityRowToAlert(rows[1]);
    expect(a.hazard).toBe("landslide");
    expect(a.severity).toBe("advisory");
    expect(a.location?.lat).toBeUndefined();
    expect(a.provenance).toBe("community");
    expect(a.title.en).toContain("Kaski");
  });

  it("keeps real coordinates", () => {
    const a = communityRowToAlert(rows[0]);
    expect(a.location?.lat).toBe(27.69);
    expect(a.location?.lng).toBe(85.3);
  });
});

describe("filterCommunityReports", () => {
  const reports = rows.map(communityRowToAlert);
  const ids = (f: Partial<typeof all>) =>
    filterCommunityReports(reports, { ...all, ...f }, NOW).map((r) => r.id);

  it("returns everything with no filters", () => {
    expect(ids({})).toEqual(["com-1", "com-2"]);
  });

  it("filters by hazard", () => {
    expect(ids({ hazard: "landslide" })).toEqual(["com-2"]);
  });

  it("filters by date window", () => {
    expect(ids({ date: "24h" })).toEqual(["com-1"]);
    expect(ids({ date: "30d" })).toEqual(["com-1", "com-2"]);
  });

  it("searches place names case-insensitively", () => {
    expect(ids({ query: "balkhu" })).toEqual(["com-1"]);
  });
});
