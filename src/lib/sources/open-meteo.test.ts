import { describe, expect, it, vi, beforeEach } from "vitest";
import { interpretWeatherCode, getCoordinatesWeather, getDistrictWeather } from "./open-meteo";
import * as util from "./util";

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

describe("open-meteo getCoordinatesWeather & getDistrictWeather", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null if Open-Meteo returns error response payload", async () => {
    vi.spyOn(util, "fetchJson").mockResolvedValue({
      error: true,
      reason: "Location out of range",
    });

    const res = await getCoordinatesWeather(27.7, 85.3);
    expect(res).toBeNull();
  });

  it("returns null if current weather block is missing", async () => {
    vi.spyOn(util, "fetchJson").mockResolvedValue({});

    const res = await getCoordinatesWeather(27.7, 85.3);
    expect(res).toBeNull();
  });

  it("parses valid weather and handles missing AQI gracefully", async () => {
    vi.spyOn(util, "fetchJson").mockImplementation((url) => {
      if (url.includes("air-quality")) {
        return Promise.reject(new Error("AQI service down"));
      }
      return Promise.resolve({
        current: {
          time: "2026-09-30T12:00",
          temperature_2m: 24.2,
          relative_humidity_2m: 60,
          precipitation: 0,
          rain: 0,
          weather_code: 1,
          wind_speed_10m: 8.5,
        },
        daily: {
          time: ["2026-09-30", "2026-10-01"],
          weather_code: [1, 2],
          temperature_2m_max: [25.0, 26.0],
          temperature_2m_min: [15.0, 16.0],
          precipitation_sum: [0.0, 1.2],
        },
      });
    });

    const res = await getCoordinatesWeather(27.7172, 85.324, "kathmandu");
    expect(res).not.toBeNull();
    expect(res?.temperature).toBe(24.2);
    expect(res?.humidity).toBe(60);
    expect(res?.weatherCode).toBe(1);
    expect(res?.forecast?.length).toBe(2);
    expect(res?.forecast?.[0].tempMax).toBe(25.0);
    expect(res?.aqi).toBeUndefined();
  });

  it("returns null for non-existent district in getDistrictWeather", async () => {
    const res = await getDistrictWeather("atlantis");
    expect(res).toBeNull();
  });
});
