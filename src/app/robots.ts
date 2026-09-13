import type { MetadataRoute } from "next";
import { CONFIG } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = CONFIG.app.url;
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
