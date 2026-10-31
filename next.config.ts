import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // We normalise every upstream hazard feed through our own /api route
  // handlers, so the browser never talks to third-party hosts directly.
  // Images: remote station photos from DHM/BIPAD, plus Wikimedia Commons
  // (CC-licensed) photos used in the Learn guides.
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "daq.hydrology.gov.np" },
      { protocol: "https", hostname: "bipadportal.gov.np" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
    ],
  },
  experimental: {
    optimizePackageImports: [
      "@tanstack/react-query",
      "clsx",
      "tailwind-merge",
    ],
  },
  async rewrites() {
    return [
      {
        // Older installs and crawlers still request /manifest.json; serve the
        // single source of truth instead of keeping a duplicate file.
        source: "/manifest.json",
        destination: "/manifest.webmanifest",
      },
    ];
  },
  async headers() {
    return [
      {
        // Browsers must always revalidate the worker script so updates roll out.
        source: "/service-worker.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
