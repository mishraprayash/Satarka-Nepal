import { describe, expect, it } from "vitest";
import {
  alertRowToAlert,
  alertToAlertInsert,
  highwayRowToHighway,
  highwayToHighwayInsert,
  type AlertRow,
  type HighwayRow,
} from "./types";
import type { Alert, HighwayBlockage } from "@/lib/types";

describe("Supabase Model Mappers", () => {
  it("converts Alert to AlertInsert and back to Alert symmetrically", () => {
    const originalAlert: Alert = {
      id: "bipad-river-101",
      hazard: "flood",
      severity: "danger",
      timeframe: "now",
      title: { en: "Koshi River at Chatara", ne: "चतरामा कोशी नदी" },
      description: { en: "Water level is 7.20m, exceeding danger level." },
      location: {
        lat: 26.85,
        lng: 87.15,
        name: "Chatara Gauge Station",
        district: "Sunsari",
        basin: "Koshi",
      },
      issuedAt: "2026-09-13T12:00:00.000Z",
      expiresAt: "2026-09-13T18:00:00.000Z",
      source: {
        id: "bipad-river",
        name: "DHM River Watch",
        url: "https://bipadportal.gov.np",
        status: "live",
        fetchedAt: "2026-09-13T12:05:00.000Z",
      },
      provenance: "official",
      meta: { waterLevel: 7.2, dangerLevel: 6.0, trend: "RISING" },
    };

    const dbInsert = alertToAlertInsert(originalAlert);
    expect(dbInsert.id).toBe("bipad-river-101");
    expect(dbInsert.severity_rank).toBe(4);
    expect(dbInsert.geom).toBe("SRID=4326;POINT(87.15 26.85)");
    expect(dbInsert.is_active).toBe(true);

    const simulatedRow: AlertRow = {
      ...dbInsert,
      created_at: "2026-09-13T12:05:00.000Z",
      updated_at: "2026-09-13T12:05:00.000Z",
    };

    const reconstructed = alertRowToAlert(simulatedRow);
    expect(reconstructed.id).toBe(originalAlert.id);
    expect(reconstructed.hazard).toBe("flood");
    expect(reconstructed.severity).toBe("danger");
    expect(reconstructed.title.en).toBe("Koshi River at Chatara");
    expect(reconstructed.title.ne).toBe("चतरामा कोशी नदी");
    expect(reconstructed.location?.lat).toBe(26.85);
    expect(reconstructed.location?.lng).toBe(87.15);
    expect(reconstructed.location?.district).toBe("Sunsari");
    expect(reconstructed.meta?.waterLevel).toBe(7.2);
  });

  it("converts HighwayBlockage to HighwayInsert and back symmetrically", () => {
    const originalHw: HighwayBlockage = {
      id: "dor-hw-404",
      roadRefno: "NH44",
      title: "Prithvi Highway Mudslide",
      location: "Mugling - Narayangarh",
      district: "Chitwan",
      status: "BLOCKED",
      closureReason: "Continuous debris fall",
      repairEta: "4 hours",
      effortsBeingMade: "2 excavators mobilized",
      remarks: "Diversion via Hetauda",
      contactPerson: "DOR Control Room 01-5522201",
      chainage: "KM 34+200",
      startedAt: "2026-09-13T10:00:00.000Z",
      lat: 27.85,
      lng: 84.55,
      images: ["https://example.com/slide.jpg"],
    };

    const insert = highwayToHighwayInsert(originalHw);
    expect(insert.id).toBe("dor-hw-404");
    expect(insert.status).toBe("BLOCKED");
    expect(insert.geom).toBe("SRID=4326;POINT(84.55 27.85)");

    const simulatedRow: HighwayRow = {
      ...insert,
      created_at: "2026-09-13T10:05:00.000Z",
      updated_at: "2026-09-13T10:05:00.000Z",
    };

    const reconstructed = highwayRowToHighway(simulatedRow);
    expect(reconstructed.id).toBe("dor-hw-404");
    expect(reconstructed.roadRefno).toBe("NH44");
    expect(reconstructed.status).toBe("BLOCKED");
    expect(reconstructed.lat).toBe(27.85);
    expect(reconstructed.lng).toBe(84.55);
    expect(reconstructed.images).toEqual(["https://example.com/slide.jpg"]);
  });
});
