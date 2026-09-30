import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock browser globals for node test environment
class LocalStorageMock {
  private store: Record<string, string> = {};
  clear() {
    this.store = {};
  }
  getItem(key: string) {
    return this.store[key] ?? null;
  }
  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }
  removeItem(key: string) {
    delete this.store[key];
  }
}

if (typeof globalThis.localStorage === "undefined") {
  (globalThis as any).localStorage = new LocalStorageMock();
}

if (typeof globalThis.document === "undefined") {
  (globalThis as any).document = {
    documentElement: {
      dataset: {},
    },
  };
}

if (typeof globalThis.window === "undefined") {
  const listeners: Record<string, Function[]> = {};
  (globalThis as any).window = {
    addEventListener: (event: string, cb: Function) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
    },
    removeEventListener: (event: string, cb: Function) => {
      listeners[event] = (listeners[event] || []).filter((fn) => fn !== cb);
    },
    dispatchEvent: (event: any) => {
      const cbs = listeners[event.type] || [];
      cbs.forEach((fn) => fn(event));
      return true;
    },
    matchMedia: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  };
  (globalThis as any).Event = class {
    type: string;
    constructor(type: string) {
      this.type = type;
    }
  };
  (globalThis as any).StorageEvent = class {
    type = "storage";
    key: string | null;
    newValue: string | null;
    constructor(type: string, init?: { key?: string | null; newValue?: string | null }) {
      this.type = type;
      this.key = init?.key ?? null;
      this.newValue = init?.newValue ?? null;
    }
  };
}

import {
  readLowBandwidth,
  setLowBandwidth,
  subscribeLowBandwidth,
  LOWBW_KEY,
  applyStoredAppearance,
} from "./theme";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import fs from "fs";
import path from "path";

describe("Settings & Low-Bandwidth Mode", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.lowbw;
  });

  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.lowbw;
  });

  it("defaults to false when no localStorage entry exists", () => {
    expect(readLowBandwidth()).toBe(false);
  });

  it("persists true to localStorage and synchronizes data-lowbw on DOM", () => {
    setLowBandwidth(true);
    expect(localStorage.getItem(LOWBW_KEY)).toBe("true");
    expect(document.documentElement.dataset.lowbw).toBe("true");
    expect(readLowBandwidth()).toBe(true);
  });

  it("persists false to localStorage and sets data-lowbw to 'false'", () => {
    setLowBandwidth(true);
    expect(readLowBandwidth()).toBe(true);
    setLowBandwidth(false);
    expect(localStorage.getItem(LOWBW_KEY)).toBe("false");
    expect(document.documentElement.dataset.lowbw).toBe("false");
    expect(readLowBandwidth()).toBe(false);
  });

  it("notifies subscribers via LOWBW_EVENT when setLowBandwidth is called", () => {
    const callback = vi.fn();
    const unsubscribe = subscribeLowBandwidth(callback);

    setLowBandwidth(true);
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
    setLowBandwidth(false);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("synchronizes DOM data-lowbw and triggers callback on storage event from another tab", () => {
    const callback = vi.fn();
    const unsubscribe = subscribeLowBandwidth(callback);

    localStorage.setItem(LOWBW_KEY, "true");
    window.dispatchEvent(new StorageEvent("storage", { key: LOWBW_KEY, newValue: "true" }));

    expect(document.documentElement.dataset.lowbw).toBe("true");
    expect(callback).toHaveBeenCalled();

    unsubscribe();
  });

  it("re-asserts low-bandwidth mode on applyStoredAppearance", () => {
    localStorage.setItem(LOWBW_KEY, "true");
    applyStoredAppearance();
    expect(document.documentElement.dataset.lowbw).toBe("true");

    localStorage.setItem(LOWBW_KEY, "false");
    applyStoredAppearance();
    expect(document.documentElement.dataset.lowbw).toBe("false");
  });
});

describe("SEO & Route Inclusions (sitemap.ts & robots.ts)", () => {
  it("includes /report and all primary routes for each locale in sitemap", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);

    expect(urls.some((u) => u.includes("/en/report"))).toBe(true);
    expect(urls.some((u) => u.includes("/ne/report"))).toBe(true);
    expect(urls.some((u) => u.includes("/en/alerts"))).toBe(true);
    expect(urls.some((u) => u.includes("/en/highways"))).toBe(true);
    expect(urls.some((u) => u.includes("/en/map"))).toBe(true);
    expect(urls.some((u) => u.includes("/en/about"))).toBe(true);
    expect(urls.some((u) => u.includes("/en/learn/flood"))).toBe(true);
  });

  it("has canonical base URLs with no trailing slashes and valid alternates", () => {
    const entries = sitemap();
    for (const entry of entries) {
      expect(entry.url).not.toMatch(/\/$/);
      expect(entry.url).not.toContain("//en");
      expect(entry.url).not.toContain("//ne");

      expect(entry.alternates).toBeDefined();
      expect(entry.alternates?.languages).toBeDefined();
      const langs = entry.alternates?.languages ?? {};
      expect(langs.en).toBeDefined();
      expect(langs.ne).toBeDefined();
      expect(langs["x-default"]).toBeDefined();
      expect(langs.en).not.toMatch(/\/$/);
    }
  });

  it("robots.ts specifies valid canonical sitemap, host, and rules", () => {
    const rob = robots();
    expect(rob.sitemap).toMatch(/^https?:\/\/.*\/sitemap\.xml$/);
    expect(rob.sitemap).not.toContain("//sitemap.xml");
    expect(rob.host).toBeDefined();
    expect(rob.rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    });
  });
});

describe("PWA Manifest Verification", () => {
  it("public/manifest.json and public/manifest.webmanifest exist and are valid JSON", () => {
    const manifestJsonPath = path.resolve(process.cwd(), "public/manifest.json");
    const webmanifestPath = path.resolve(process.cwd(), "public/manifest.webmanifest");

    expect(fs.existsSync(manifestJsonPath)).toBe(true);
    expect(fs.existsSync(webmanifestPath)).toBe(true);

    const manifestJson = JSON.parse(fs.readFileSync(manifestJsonPath, "utf-8"));
    const webmanifest = JSON.parse(fs.readFileSync(webmanifestPath, "utf-8"));

    expect(manifestJson.name).toContain("Satarka");
    expect(manifestJson.short_name).toBe("Satarka");
    expect(manifestJson.display).toBe("standalone");
    expect(manifestJson.orientation).toBe("any");
    expect(manifestJson.theme_color).toBe("#090a0f");
    expect(manifestJson.background_color).toBe("#090a0f");
    expect(manifestJson.start_url).toBe("/");
    expect(manifestJson.scope).toBe("/");

    // Required raster icons for PWA installability
    const iconSrcs = manifestJson.icons.map((i: { src: string }) => i.src);
    expect(iconSrcs).toContain("/icon-192.png");
    expect(iconSrcs).toContain("/icon-512.png");

    expect(webmanifest).toEqual(manifestJson);
  });

  it("raster icon files exist on disk in public/", () => {
    expect(fs.existsSync(path.resolve(process.cwd(), "public/icon-192.png"))).toBe(true);
    expect(fs.existsSync(path.resolve(process.cwd(), "public/icon-512.png"))).toBe(true);
    expect(fs.existsSync(path.resolve(process.cwd(), "public/apple-touch-icon.png"))).toBe(true);
  });
});
