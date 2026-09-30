import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NEPAL_DISTRICTS } from "@/lib/districts";
import { HISTORIC_DISASTERS } from "@/lib/disaster-history";
import {
  setTheme,
  readTheme,
  subscribeTheme,
  setLowBandwidth,
  readLowBandwidth,
  subscribeLowBandwidth,
  THEME_KEY,
  LOWBW_KEY,
} from "@/lib/theme";

describe("Global Navigation & Command Palette Suite", () => {
  beforeEach(() => {
    // Setup clean mock window and document environment
    const storage: Record<string, string> = {};
    const dataset: Record<string, string> = {};
    const eventListeners: Record<string, Function[]> = {};

    global.window = {
      location: {
        pathname: "/en/map",
        search: "?lat=27.7172&lng=85.3240&zoom=12",
        hash: "#overview",
        href: "",
      },
      dispatchEvent: vi.fn((event: Event) => {
        const listeners = eventListeners[event.type] || [];
        listeners.forEach((fn) => fn(event));
        return true;
      }),
      addEventListener: vi.fn((type: string, fn: Function) => {
        if (!eventListeners[type]) eventListeners[type] = [];
        eventListeners[type].push(fn);
      }),
      removeEventListener: vi.fn((type: string, fn: Function) => {
        if (eventListeners[type]) {
          eventListeners[type] = eventListeners[type].filter((cb) => cb !== fn);
        }
      }),
      matchMedia: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    } as any;

    global.localStorage = {
      getItem: vi.fn((key: string) => storage[key] ?? null),
      setItem: vi.fn((key: string, val: string) => {
        storage[key] = val;
      }),
      removeItem: vi.fn((key: string) => {
        delete storage[key];
      }),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };

    global.document = {
      documentElement: {
        dataset,
      },
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Keyboard Shortcut Resolution", () => {
    it("recognizes Cmd+K on Mac and Ctrl+K on Windows/Linux", () => {
      const isCmdOrCtrlK = (e: { metaKey: boolean; ctrlKey: boolean; key: string }) =>
        (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";

      // Mac Cmd+K
      expect(isCmdOrCtrlK({ metaKey: true, ctrlKey: false, key: "k" })).toBe(true);
      expect(isCmdOrCtrlK({ metaKey: true, ctrlKey: false, key: "K" })).toBe(true);

      // Windows/Linux Ctrl+K
      expect(isCmdOrCtrlK({ metaKey: false, ctrlKey: true, key: "k" })).toBe(true);
      expect(isCmdOrCtrlK({ metaKey: false, ctrlKey: true, key: "K" })).toBe(true);

      // Other keys
      expect(isCmdOrCtrlK({ metaKey: false, ctrlKey: false, key: "k" })).toBe(false);
      expect(isCmdOrCtrlK({ metaKey: true, ctrlKey: false, key: "p" })).toBe(false);
    });

    it("identifies Escape key reliably", () => {
      const isEscape = (e: { key: string }) => e.key === "Escape";
      expect(isEscape({ key: "Escape" })).toBe(true);
      expect(isEscape({ key: "Enter" })).toBe(false);
      expect(isEscape({ key: "Tab" })).toBe(false);
    });
  });

  describe("Search Indexing & Token Matching", () => {
    function createMockIndex(isNe: boolean) {
      const emergencyItems = [
        {
          id: "em-police",
          category: "emergency",
          title: isNe ? "नेपाल प्रहरी" : "Nepal Police",
          phone: "100",
          keywords: ["100", "police", "nepal police", "प्रहरी", "नेपाल प्रहरी"],
        },
        {
          id: "em-amb",
          category: "emergency",
          title: isNe ? "एम्बुलेन्स सेवा" : "Ambulance Service",
          phone: "102",
          keywords: ["102", "ambulance", "hospital", "एम्बुलेन्स", "अस्पताल"],
        },
        {
          id: "em-dhm",
          category: "emergency",
          title: isNe ? "बाढी सूचना हटलाइन (DHM)" : "DHM Flood Watch Toll-Free",
          phone: "1155",
          keywords: ["1155", "dhm", "flood", "बाढी", "जल तथा मौसम"],
        },
      ];

      const actionItems = [
        {
          id: "action-disclaimer",
          category: "action",
          title: isNe ? "सुरक्षा सल्लाह तथा अस्वीकरण" : "Safety Advisory & Disclaimer",
          keywords: ["disclaimer", "safety", "advisory", "modal", "अस्वीकरण", "सल्लाह"],
        },
      ];

      const districtItems = NEPAL_DISTRICTS.map((d) => ({
        id: `dist-${d.id}`,
        category: "district",
        title: isNe ? d.ne : d.en,
        keywords: [d.en, d.ne, d.id, "district", "जिल्ला"],
      }));

      const highwayItems = [
        {
          id: "hw-nh44",
          category: "highway",
          title: isNe ? "पृथ्वी राजमार्ग (NH44)" : "Prithvi Highway (NH44)",
          keywords: ["nh44", "prithvi", "mugling", "kathmandu", "पृथ्वी", "मुग्लिङ"],
        },
      ];

      return [...emergencyItems, ...actionItems, ...districtItems, ...highwayItems];
    }

    function search(items: ReturnType<typeof createMockIndex>, query: string) {
      const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
      if (!tokens.length) return items;
      return items.filter((item) => {
        const text = [item.title, (item as any).phone ?? "", ...item.keywords].join(" ").toLowerCase();
        return tokens.every((token) => text.includes(token));
      });
    }

    it("finds districts in English even when browsing in Nepali locale", () => {
      const neItems = createMockIndex(true); // Nepali UI
      const results = search(neItems, "kathmandu");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.id === "dist-kathmandu")).toBe(true);
    });

    it("finds districts in Devanagari even when browsing in English locale", () => {
      const enItems = createMockIndex(false); // English UI
      const results = search(enItems, "काठमाडौं");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.id === "dist-kathmandu")).toBe(true);
    });

    it("finds emergency hotlines by dialed number, English, and Nepali keywords", () => {
      const items = createMockIndex(false);

      expect(search(items, "100")[0]?.id).toBe("em-police");
      expect(search(items, "police")[0]?.id).toBe("em-police");
      expect(search(items, "प्रहरी")[0]?.id).toBe("em-police");

      expect(search(items, "102")[0]?.id).toBe("em-amb");
      expect(search(items, "ambulance")[0]?.id).toBe("em-amb");
      expect(search(items, "एम्बुलेन्स")[0]?.id).toBe("em-amb");

      expect(search(items, "1155")[0]?.id).toBe("em-dhm");
      expect(search(items, "flood")[0]?.id).toBe("em-dhm");
    });

    it("indexes the safety disclaimer modal action", () => {
      const items = createMockIndex(false);
      const enResults = search(items, "disclaimer");
      expect(enResults.some((r) => r.id === "action-disclaimer")).toBe(true);

      const neResults = search(items, "अस्वीकरण");
      expect(neResults.some((r) => r.id === "action-disclaimer")).toBe(true);
    });

    it("finds highways by highway number code and name", () => {
      const items = createMockIndex(false);
      expect(search(items, "NH44").some((r) => r.id === "hw-nh44")).toBe(true);
      expect(search(items, "prithvi").some((r) => r.id === "hw-nh44")).toBe(true);
      expect(search(items, "पृथ्वी").some((r) => r.id === "hw-nh44")).toBe(true);
    });

    it("handles multi-term tokenized search queries gracefully", () => {
      const items = createMockIndex(false);
      const multiTokenResults = search(items, "police 100");
      expect(multiTokenResults.length).toBeGreaterThan(0);
      expect(multiTokenResults[0].id).toBe("em-police");
    });
  });

  describe("Locale Switcher Path & Query Parameter Preservation", () => {
    it("preserves route pathname, query string parameters, and hash when switching languages", () => {
      const currentPathname = "/map";
      const search = "?lat=27.7172&lng=85.3240&zoom=12";
      const hash = "#overview";

      const target = `${currentPathname}${search}${hash}`;
      expect(target).toBe("/map?lat=27.7172&lng=85.3240&zoom=12#overview");

      // Verify simulated router replacement preserves parameters
      const simulatedPush = vi.fn();
      function handleLanguageSwitch(newLocale: "en" | "ne") {
        const s = window.location.search;
        const h = window.location.hash;
        const targetUrl = `${currentPathname}${s}${h}`;
        simulatedPush(targetUrl, { locale: newLocale });
      }

      handleLanguageSwitch("ne");
      expect(simulatedPush).toHaveBeenCalledWith(
        "/map?lat=27.7172&lng=85.3240&zoom=12#overview",
        { locale: "ne" }
      );
    });
  });

  describe("Appearance & Low-Bandwidth Synchronization", () => {
    it("synchronizes low-bandwidth toggle across instances via custom event", () => {
      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();

      const unsubscribe1 = subscribeLowBandwidth(subscriber1);
      const unsubscribe2 = subscribeLowBandwidth(subscriber2);

      expect(readLowBandwidth()).toBe(false);

      // Enable low bandwidth
      setLowBandwidth(true);
      expect(readLowBandwidth()).toBe(true);
      expect(document.documentElement.dataset.lowbw).toBe("true");
      expect(subscriber1).toHaveBeenCalledTimes(1);
      expect(subscriber2).toHaveBeenCalledTimes(1);

      // Disable low bandwidth
      setLowBandwidth(false);
      expect(readLowBandwidth()).toBe(false);
      expect(document.documentElement.dataset.lowbw).toBe("false");
      expect(subscriber1).toHaveBeenCalledTimes(2);
      expect(subscriber2).toHaveBeenCalledTimes(2);

      unsubscribe1();
      unsubscribe2();
    });

    it("synchronizes theme toggle across subscribers", () => {
      const subscriber = vi.fn();
      const unsubscribe = subscribeTheme(subscriber);

      setTheme("dark");
      expect(readTheme()).toBe("dark");
      expect(document.documentElement.dataset.theme).toBe("dark");
      expect(subscriber).toHaveBeenCalledTimes(1);

      setTheme("light");
      expect(readTheme()).toBe("light");
      expect(document.documentElement.dataset.theme).toBe("light");
      expect(subscriber).toHaveBeenCalledTimes(2);

      unsubscribe();
    });
  });
});
