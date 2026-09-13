import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { HAZARD_ORDER } from "@/lib/ui";
import { CONFIG } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = CONFIG.app.url;
  const routes = ["", "/alerts", "/map", "/highways", "/learn", "/about"];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const route of routes) {
      entries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === "" || route === "/alerts" || route === "/highways" ? "always" : "daily",
        priority: route === "" ? 1.0 : route === "/alerts" ? 0.9 : 0.8,
      });
    }

    for (const hazard of HAZARD_ORDER) {
      entries.push({
        url: `${baseUrl}/${locale}/learn/${hazard}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  return entries;
}
