import { describe, expect, it } from "vitest";
import { _internal as geoglows } from "./geoglows";

describe("geoglows severityFromReturnPeriod", () => {
  it("returns null below the 2-year level", () => {
    expect(geoglows.severityFromReturnPeriod(10, { rp2: 20, rp5: 30, rp10: 40 })).toBeNull();
  });

  it("returns watch at or above the 2-year level", () => {
    expect(geoglows.severityFromReturnPeriod(20, { rp2: 20, rp5: 30, rp10: 40 })).toBe("watch");
  });

  it("returns warning at the 5-year level", () => {
    expect(geoglows.severityFromReturnPeriod(31, { rp2: 20, rp5: 30, rp10: 40 })).toBe("warning");
  });

  it("returns danger at the 10-year level", () => {
    expect(geoglows.severityFromReturnPeriod(45, { rp2: 20, rp5: 30, rp10: 40 })).toBe("danger");
  });
});

describe("geoglows parsePeakFlow", () => {
  it("finds the peak of the median forecast flow and its timestamp", () => {
    const { peak, peakAt } = geoglows.parsePeakFlow({
      flow_median: [1, 3, 2, 9, 4],
      datetime: ["t0", "t1", "t2", "t3", "t4"],
    });
    expect(peak).toBe(9);
    expect(peakAt).toBe("t3");
  });

  it("returns null peak for empty data", () => {
    const { peak, peakAt } = geoglows.parsePeakFlow({});
    expect(peak).toBeNull();
    expect(peakAt).toBeNull();
  });

  it("tolerates sentinel values", () => {
    const { peak } = geoglows.parsePeakFlow({ flow_median: [-9999, 5, -99991] });
    expect(peak).toBe(5);
  });
});

describe("geoglows parseReturnPeriods", () => {
  it("reads common threshold keys defensively", () => {
    expect(geoglows.parseReturnPeriods({ return_period_2: 20, return_period_5: 30, return_period_10: 40 })).toEqual({
      rp2: 20,
      rp5: 30,
      rp10: 40,
    });
    expect(geoglows.parseReturnPeriods({})).toEqual({ rp2: null, rp5: null, rp10: null });
  });
});
