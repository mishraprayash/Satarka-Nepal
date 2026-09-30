import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { HAZARD_ORDER } from "@/lib/ui";
import { CONFIG } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = CONFIG.app.url.replace(/\/$/, "");
  const routes = ["", "/alerts", "/map", "/highways", "/learn", "/about", "/report"];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const route of routes) {
      entries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === "" || route === "/alerts" || route === "/highways" ? "always" : "daily",
        priority: route === "" ? 1.0 : route === "/alerts" ? 0.9 : route === "/highways" || route === "/map" ? 0.8 : 0.7,
        alternates: {
          languages: {
            en: `${baseUrl}/en${route}`,
            ne: `${baseUrl}/ne${route}`,
            "x-default": `${baseUrl}/${routing.defaultLocale}${route}`,
          },
        },
      });
    }

    for (const hazard of HAZARD_ORDER) {
      entries.push({
        url: `${baseUrl}/${locale}/learn/${hazard}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
        alternates: {
          languages: {
            en: `${baseUrl}/en/learn/${hazard}`,
            ne: `${baseUrl}/ne/learn/${hazard}`,
            "x-default": `${baseUrl}/${routing.defaultLocale}/learn/${hazard}`,
          },
        },
      });
    }
  }

  return entries;
}
