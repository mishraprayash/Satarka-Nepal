import type { DistrictWeather } from "@/lib/types";
import { NEPAL_DISTRICTS } from "@/lib/districts";
import { fetchJson, num, str } from "./util";

interface OpenMeteoWeatherResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    rain?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
  };
}

interface OpenMeteoAqiResponse {
  current?: {
    pm10?: number;
    pm2_5?: number;
    us_aqi?: number;
    european_aqi?: number;
  };
}

import { CONFIG } from "@/lib/config";

/**
 * Fetches real-time weather and air quality for any coordinate in Nepal via Open-Meteo.
 * Free, non-commercial open data from ECMWF and Copernicus CAMS.
 */
export async function getCoordinatesWeather(
  lat: number,
  lng: number,
  districtId: string = "custom",
): Promise<DistrictWeather | null> {
  const weatherUrl =
    `${CONFIG.apis.openMeteoForecast}?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
    "&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=3";

  const aqiUrl =
    `${CONFIG.apis.openMeteoAirQuality}?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
    "&current=pm10,pm2_5,us_aqi,european_aqi&timezone=auto";

  try {
    const [wRes, aqiRes] = await Promise.allSettled([
      fetchJson<OpenMeteoWeatherResponse>(weatherUrl, { revalidate: 900 }),
      fetchJson<OpenMeteoAqiResponse>(aqiUrl, { revalidate: 1800 }),
    ]);

    if (wRes.status !== "fulfilled" || !wRes.value?.current) {
      return null;
    }

    const w = wRes.value.current;
    const daily = wRes.value.daily;
    const aqi = aqiRes.status === "fulfilled" ? aqiRes.value?.current : undefined;

    const forecast =
      Array.isArray(daily?.time) && daily?.time.length
        ? daily.time.map((date, idx) => ({
            date,
            weatherCode: daily.weather_code?.[idx] ?? 0,
            tempMax: daily.temperature_2m_max?.[idx] ?? 0,
            tempMin: daily.temperature_2m_min?.[idx] ?? 0,
            precipitationSum: daily.precipitation_sum?.[idx] ?? 0,
          }))
        : undefined;

    return {
      districtId,
      temperature: num(w.temperature_2m) ?? 0,
      humidity: num(w.relative_humidity_2m) ?? 0,
      rain: num(w.rain) ?? 0,
      precipitationSum: num(w.precipitation) ?? 0,
      weatherCode: num(w.weather_code) ?? 0,
      windSpeed: num(w.wind_speed_10m) ?? 0,
      aqi: num(aqi?.us_aqi) ?? undefined,
      pm25: num(aqi?.pm2_5) ?? undefined,
      pm10: num(aqi?.pm10) ?? undefined,
      observedAt: str(w.time) ?? new Date().toISOString(),
      forecast,
    };
  } catch (err) {
    console.error(`[open-meteo] weather fetch failed for (${lat}, ${lng}):`, err);
    return null;
  }
}

/**
 * Fetches weather and air quality for one of Nepal's 77 districts by its slug/ID.
 */
export async function getDistrictWeather(districtId: string): Promise<DistrictWeather | null> {
  const d = NEPAL_DISTRICTS.find((item) => item.id.toLowerCase() === districtId.toLowerCase());
  if (!d) return null;
  return getCoordinatesWeather(d.lat, d.lng, d.id);
}

/**
 * WMO Weather interpretation code mapper for bilingual display.
 */
export function interpretWeatherCode(code: number): { en: string; ne: string } {
  if (code === 0) return { en: "Clear sky", ne: "सफा आकाश" };
  if (code === 1 || code === 2) return { en: "Partly cloudy", ne: "आंशिक बदली" };
  if (code === 3) return { en: "Overcast", ne: "पूर्ण बदली" };
  if (code >= 45 && code <= 48) return { en: "Fog / Mist", ne: "कुहिरो / हुस्सु" };
  if (code >= 51 && code <= 55) return { en: "Light Drizzle", ne: "हल्का सिमसिम पानी" };
  if (code >= 61 && code <= 65) return { en: "Rain", ne: "वर्षा" };
  if (code >= 71 && code <= 77) return { en: "Snowfall", ne: "हिमपात" };
  if (code >= 80 && code <= 82) return { en: "Rain showers", ne: "क्षणिक भारी वर्षा" };
  if (code >= 95 && code <= 99) return { en: "Thunderstorm", ne: "चट्याङसहितको वर्षा" };
  return { en: "Variable", ne: "सामान्य" };
}
