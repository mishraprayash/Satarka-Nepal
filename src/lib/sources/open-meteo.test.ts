import { describe, expect, it } from "vitest";
import { interpretWeatherCode } from "./open-meteo";

describe("open-meteo interpretWeatherCode", () => {
  it("translates clear sky correctly in EN and NE", () => {
    const res = interpretWeatherCode(0);
    expect(res.en).toBe("Clear sky");
    expect(res.ne).toBe("सफा आकाश");
  });

  it("translates rain and thunderstorm codes", () => {
    const rain = interpretWeatherCode(61);
    expect(rain.en).toBe("Rain");
    expect(rain.ne).toBe("वर्षा");

    const storm = interpretWeatherCode(95);
    expect(storm.en).toBe("Thunderstorm");
    expect(storm.ne).toBe("चट्याङसहितको वर्षा");
  });

  it("handles snowfall and mist", () => {
    const snow = interpretWeatherCode(71);
    expect(snow.en).toBe("Snowfall");
    expect(snow.ne).toBe("हिमपात");

    const fog = interpretWeatherCode(45);
    expect(fog.en).toBe("Fog / Mist");
    expect(fog.ne).toBe("कुहिरो / हुस्सु");
  });

  it("returns fallback for unmapped codes", () => {
    const fallback = interpretWeatherCode(999);
    expect(fallback.en).toBe("Variable");
    expect(fallback.ne).toBe("सामान्य");
  });
});
