import { describe, it, expect } from "vitest";
import type { Alert } from "@/lib/types";
import { nationalLevel } from "./national-level";

const a = (severity: Alert["severity"]) => ({ severity }) as Alert;

describe("nationalLevel", () => {
  it("is clear with no alerts or only advisories", () => {
    expect(nationalLevel([])).toEqual({ level: "clear", count: 0 });
    expect(nationalLevel([a("advisory"), a("info")])).toEqual({ level: "clear", count: 0 });
  });

  it("takes the most severe level and counts alerts at that level", () => {
    expect(nationalLevel([a("watch"), a("warning"), a("warning")])).toEqual({ level: "warning", count: 2 });
    expect(nationalLevel([a("watch"), a("danger")])).toEqual({ level: "danger", count: 1 });
  });
});
