"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { NEPAL_DISTRICTS } from "@/lib/districts";
import { HISTORIC_DISASTERS } from "@/lib/disaster-history";
import { readTheme, setTheme } from "@/lib/theme";
import {
  CloseIcon,
  HazardGlyph,
  MapPinIcon,
  PhoneIcon,
  SearchIcon,
  ArrowIcon,
  SeverityGlyph,
  MoonIcon,
  GlobeIcon,
} from "@/components/icons";

interface PaletteItem {
  category: "emergency" | "action" | "navigation" | "guide" | "highway" | "district" | "history";
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  url?: string;
  phone?: string;
  hazard?: "flood" | "glof" | "earthquake" | "landslide";
  keywords?: string[];
  action?: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const isBackdropMouseDown = useRef(false);

  const tnav = useTranslations("nav");
  const thaz = useTranslations("hazards");

  // Focus input when opened, lock body scroll, and capture keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    setQuery("");
    setSelectedIndex(0);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => inputRef.current?.focus(), 50);

    const handleKey = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")
      ) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      }
    };

    // Capture phase prevents conflict with underlying modals and parent window listeners
    window.addEventListener("keydown", handleKey, true);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKey, true);
    };
  }, [isOpen, onClose]);

  // Static datasets with comprehensive bilingual indexing
  const allItems: PaletteItem[] = useMemo(() => {
    const isNe = locale === "ne";

    const emergencyItems: PaletteItem[] = [
      {
        id: "em-police",
        category: "emergency",
        title: isNe ? "नेपाल प्रहरी" : "Nepal Police",
        subtitle: isNe ? "आपतकालीन सेवा · डायल १००" : "Emergency Police Response · Dial 100",
        phone: "100",
        badge: "100",
        keywords: [
          "100",
          "police",
          "nepal police",
          "security",
          "cop",
          "प्रहरी",
          "नेपाल प्रहरी",
          "सुरक्षा",
          "आपतकालीन",
        ],
      },
      {
        id: "em-fire",
        category: "emergency",
        title: isNe ? "दमकल (अग्नि नियन्त्रक)" : "Fire Brigade",
        subtitle: isNe ? "आगो तथा उद्धार · डायल १०१" : "Fire & Rescue Operations · Dial 101",
        phone: "101",
        badge: "101",
        keywords: [
          "101",
          "fire",
          "brigade",
          "rescue",
          "flame",
          "दमकल",
          "अग्नि",
          "आगो",
          "उद्धार",
        ],
      },
      {
        id: "em-amb",
        category: "emergency",
        title: isNe ? "एम्बुलेन्स सेवा" : "Ambulance Service",
        subtitle: isNe ? "स्वास्थ्य तथा प्राथमिक उपचार · डायल १०२" : "Medical Emergency Transport · Dial 102",
        phone: "102",
        badge: "102",
        keywords: [
          "102",
          "ambulance",
          "medical",
          "hospital",
          "health",
          "doctor",
          "एम्बुलेन्स",
          "अस्पताल",
          "स्वास्थ्य",
          "उपचार",
        ],
      },
      {
        id: "em-dhm",
        category: "emergency",
        title: isNe ? "बाढी सूचना हटलाइन (DHM)" : "DHM Flood Watch Toll-Free",
        subtitle: isNe ? "जल तथा मौसम विज्ञान विभाग · डायल ११५५" : "Hydrology & River Level Center · Dial 1155",
        phone: "1155",
        badge: "1155",
        keywords: [
          "1155",
          "dhm",
          "flood",
          "river",
          "hydrology",
          "toll-free",
          "water",
          "बाढी",
          "जल",
          "मौसम",
          "नदी",
          "हटलाइन",
        ],
      },
      {
        id: "em-ndrrma",
        category: "emergency",
        title: isNe ? "विपद् व्यवस्थापन हटलाइन (NDRRMA)" : "NDRRMA Disaster Hotline",
        subtitle: isNe ? "राष्ट्रिय विपद् जोखिम न्यूनीकरण · डायल ११४९" : "National Disaster Response Authority · Dial 1149",
        phone: "1149",
        badge: "1149",
        keywords: [
          "1149",
          "ndrrma",
          "bipad",
          "disaster",
          "management",
          "helpline",
          "विपद्",
          "व्यवस्थापन",
          "जोखिम",
          "गृह मन्त्रालय",
        ],
      },
    ];

    const actionItems: PaletteItem[] = [
      {
        id: "action-disclaimer",
        category: "action",
        title: isNe ? "सुरक्षा सल्लाह तथा अस्वीकरण" : "Safety Advisory & Disclaimer",
        subtitle: isNe ? "आधिकारिक कार्यविधि, डाटा संकलन तथा जनसुरक्षा सूचना" : "Official protocols, telemetry gaps & safety disclaimer modal",
        badge: "MODAL",
        keywords: [
          "disclaimer",
          "safety",
          "advisory",
          "notice",
          "modal",
          "protocols",
          "legal",
          "guidelines",
          "अस्वीकरण",
          "सल्लाह",
          "सूचना",
          "प्रोटोकल",
          "कानुनी",
          "जानकारी",
        ],
        action: () => {
          window.dispatchEvent(new CustomEvent("satarka:open-disclaimer"));
        },
      },
      {
        id: "action-theme",
        category: "action",
        title: isNe ? "थिम परिवर्तन गर्नुहोस्" : "Toggle Theme (Light / Dark)",
        subtitle: isNe ? "अँध्यारो वा उज्यालो मोडमा बदल्नुहोस्" : "Switch between dark and light appearance",
        badge: "THEME",
        keywords: [
          "theme",
          "dark",
          "light",
          "mode",
          "appearance",
          "color",
          "थिम",
          "अँध्यारो",
          "उज्यालो",
          "रंग",
        ],
        action: () => {
          setTheme(readTheme() === "dark" ? "light" : "dark");
        },
      },
      {
        id: "action-language",
        category: "action",
        title: isNe ? "Switch Language to English" : "नेपाली भाषामा परिवर्तन गर्नुहोस्",
        subtitle: isNe ? "View Satarka in English" : "सतर्क नेपाली भाषामा हेर्नुहोस्",
        badge: isNe ? "EN" : "नेपाली",
        keywords: [
          "language",
          "english",
          "nepali",
          "locale",
          "translate",
          "भाषा",
          "नेपाली",
          "अंग्रेजी",
        ],
        action: () => {
          const nextLocale = isNe ? "en" : "ne";
          const search = typeof window !== "undefined" ? window.location.search : "";
          const hash = typeof window !== "undefined" ? window.location.hash : "";
          const pathnameWithoutLocale =
            typeof window !== "undefined"
              ? window.location.pathname.replace(/^\/(en|ne)/, "") || "/"
              : "/";
          router.replace(`${pathnameWithoutLocale}${search}${hash}`, { locale: nextLocale });
        },
      },
    ];

    const navItems: PaletteItem[] = [
      {
        id: "nav-home",
        category: "navigation",
        title: tnav("home"),
        subtitle: isNe ? "मुख्य पृष्ठ तथा प्रत्यक्ष सारांश" : "Main dashboard & live hazard overview",
        url: "/",
        keywords: ["home", "dashboard", "main", "satarka", "गृह", "मुख्य"],
      },
      {
        id: "nav-alerts",
        category: "navigation",
        title: tnav("alerts"),
        subtitle: isNe ? "सक्रिय बाढी, पहिरो तथा भूकम्प सूचनाहरू" : "Active multi-hazard verified alerts",
        url: "/alerts",
        badge: "LIVE",
        keywords: ["alerts", "warning", "danger", "advisory", "चेतावनी", "सूचना", "खतरा", "सतर्कता"],
      },
      {
        id: "nav-map",
        category: "navigation",
        title: tnav("map"),
        subtitle: isNe ? "नदी स्टेशन, भूकम्पीय क्षेत्र र हिमताल नक्सा" : "Hydrological gauges, fault lines, glacial lakes",
        url: "/map",
        keywords: ["map", "gis", "stations", "gauges", "rivers", "faults", "नक्सा", "स्टेशन", "नदी"],
      },
      {
        id: "nav-highways",
        category: "navigation",
        title: isNe ? "राष्ट्रिय राजमार्ग" : "National Highways",
        subtitle: isNe ? "सडक विभागबाट प्रत्यक्ष सडक अवरोध तथा आवागमन" : "Real-time road blockages, landslides, repair ETAs",
        url: "/highways",
        badge: "ROAD",
        keywords: ["highways", "roads", "dor", "traffic", "blockage", "landslide", "राजमार्ग", "सडक", "पहिरो", "अवरोध"],
      },
      {
        id: "nav-learn",
        category: "navigation",
        title: tnav("learn"),
        subtitle: isNe ? "विपद् पूर्वतयारी तथा सुरक्षा उपायहरू" : "Preparedness guides & historical data",
        url: "/learn",
        keywords: ["learn", "guides", "preparedness", "education", "सुरक्षा", "तयारी", "जानकारी", "गाइड"],
      },
      {
        id: "nav-report",
        category: "navigation",
        title: tnav("report"),
        subtitle: isNe ? "सामुदायिक विपद् घटना रिपोर्टिङ" : "Report a community hazard or incident",
        url: "/report",
        keywords: ["report", "community", "incident", "hazard", "रिपोर्ट", "घटना", "जानकारी"],
      },
      {
        id: "nav-about",
        category: "navigation",
        title: tnav("about"),
        subtitle: isNe ? "उद्देश्य, डेटा स्रोत र आपतकालीन सम्पर्क" : "Mission, methodology & emergency contacts",
        url: "/about",
        keywords: ["about", "mission", "sources", "methodology", "बारेमा", "उद्देश्य", "स्रोत"],
      },
    ];

    const guideItems: PaletteItem[] = [
      {
        id: "guide-flood",
        category: "guide",
        title: thaz("flood.name"),
        subtitle: thaz("flood.short"),
        url: "/learn/flood",
        hazard: "flood",
        keywords: ["flood", "river", "rain", "monsoon", "बाढी", "नदी", "वर्षा"],
      },
      {
        id: "guide-glof",
        category: "guide",
        title: thaz("glof.name"),
        subtitle: thaz("glof.short"),
        url: "/learn/glof",
        hazard: "glof",
        keywords: ["glof", "glacial", "lake", "glacier", "हिमताल", "हिमनदी", "विस्फोट"],
      },
      {
        id: "guide-earthquake",
        category: "guide",
        title: thaz("earthquake.name"),
        subtitle: thaz("earthquake.short"),
        url: "/learn/earthquake",
        hazard: "earthquake",
        keywords: ["earthquake", "seismic", "tremor", "fault", "भूकम्प", "कम्पन"],
      },
      {
        id: "guide-landslide",
        category: "guide",
        title: thaz("landslide.name"),
        subtitle: thaz("landslide.short"),
        url: "/learn/landslide",
        hazard: "landslide",
        keywords: ["landslide", "debris", "slope", "rockfall", "पहिरो", "भिर"],
      },
    ];

    const districtItems: PaletteItem[] = NEPAL_DISTRICTS.map((d) => ({
      id: `dist-${d.id}`,
      category: "district",
      title: isNe ? d.ne : d.en,
      subtitle: isNe ? `जिल्ला (${d.en}) · नक्सामा हेर्नुहोस्` : `District (${d.ne}) · View on Hazard Map`,
      url: `/map?lat=${d.lat}&lng=${d.lng}&zoom=11&title=${encodeURIComponent(isNe ? d.ne : d.en)}`,
      badge: `${d.lat.toFixed(1)}°N, ${d.lng.toFixed(1)}°E`,
      keywords: [d.en, d.ne, d.id, "district", "जिल्ला"],
    }));

    const highwayItems: PaletteItem[] = [
      {
        id: "hw-nh44",
        category: "highway",
        title: isNe ? "पृथ्वी राजमार्ग (NH44 / मुग्लिङ-काठमाडौं)" : "Prithvi Highway (NH44 / Mugling-Kathmandu)",
        subtitle: isNe ? "मुख्य आपूर्ति मार्ग · प्रत्यक्ष अवरोध स्थिति" : "Critical supply lifeline · Real-time road status",
        url: "/highways",
        badge: "NH44",
        keywords: ["nh44", "prithvi", "mugling", "kathmandu", "पृथ्वी", "मुग्लिङ", "काठमाडौं"],
      },
      {
        id: "hw-nh08",
        category: "highway",
        title: isNe ? "बी.पी. राजमार्ग (NH08 / बनेपा-सिन्धुली-बर्दिबास)" : "BP Highway (NH08 / Banepa-Sindhuli-Bardibas)",
        subtitle: isNe ? "पूर्वी नेपाल जोड्ने द्रुतमार्ग · पहिरो निगरानी" : "Eastern corridor expressway · Landslide monitoring",
        url: "/highways",
        badge: "NH08",
        keywords: ["nh08", "bp", "banepa", "sindhuli", "bardibas", "बनेपा", "सिन्धुली", "बर्दिबास"],
      },
      {
        id: "hw-nh47",
        category: "highway",
        title: isNe ? "सिद्धार्थ राजमार्ग (NH47 / बुटवल-पाल्पा-पोखरा)" : "Siddhartha Highway (NH47 / Butwal-Palpa-Pokhara)",
        subtitle: isNe ? "सिद्धबाबा खण्ड तथा पाल्पा पहिरो क्षेत्र" : "Siddhababa section & Palpa landslide transit",
        url: "/highways",
        badge: "NH47",
        keywords: ["nh47", "siddhartha", "butwal", "palpa", "pokhara", "बुटवल", "पाल्पा", "पोखरा"],
      },
      {
        id: "hw-nh41",
        category: "highway",
        title: isNe ? "त्रिभुवन राजपथ (NH41 / नौबिसे-दामन-हेटौंडा)" : "Tribhuvan Highway (NH41 / Naubise-Daman-Hetauda)",
        subtitle: isNe ? "ऐतिहासिक पहाडी सडक मार्ग" : "Historic mountain transit route",
        url: "/highways",
        badge: "NH41",
        keywords: ["nh41", "tribhuvan", "naubise", "daman", "hetauda", "त्रिभुवन", "नौबिसे", "हेटौंडा"],
      },
      {
        id: "hw-nh58",
        category: "highway",
        title: isNe ? "कर्णाली राजमार्ग (NH58 / सुर्खेत-जुम्ला)" : "Karnali Highway (NH58 / Surkhet-Jumla)",
        subtitle: isNe ? "कर्णाली करिडोर · पहिरो जोखिम अनुगमन" : "Karnali corridor · Landslide vulnerability monitoring",
        url: "/highways",
        badge: "NH58",
        keywords: ["nh58", "karnali", "surkhet", "jumla", "कर्णाली", "सुर्खेत", "जुम्ला"],
      },
      {
        id: "hw-nh01",
        category: "highway",
        title: isNe ? "पूर्व-पश्चिम राजमार्ग (NH01 / महेन्द्र राजमार्ग)" : "East-West Highway (NH01 / Mahendra Highway)",
        subtitle: isNe ? "तराई लाइफलाइन · बाढी तथा पुल डाइभर्सन" : "Terai arterial lifeline · Flood & bridge diversions",
        url: "/highways",
        badge: "NH01",
        keywords: ["nh01", "mahendra", "east-west", "terai", "महेन्द्र", "पूर्व-पश्चिम"],
      },
      {
        id: "hw-nh03",
        category: "highway",
        title: isNe ? "पुष्पलाल मध्यपहाडी राजमार्ग (NH03)" : "Pushpalal Mid-Hill Highway (NH03)",
        subtitle: isNe ? "मध्यपहाडी लोकमार्ग खण्डहरू" : "Mid-hill trans-Nepal connector",
        url: "/highways",
        badge: "NH03",
        keywords: ["nh03", "mid-hill", "pushpalal", "मध्यपहाडी", "पुष्पलाल"],
      },
    ];

    const historyItems: PaletteItem[] = HISTORIC_DISASTERS.map((h) => ({
      id: `hist-${h.id}`,
      category: "history",
      title: isNe ? h.title.ne : h.title.en,
      subtitle: isNe ? `${h.year} (${h.bsYear}) · ${h.location.ne}` : `${h.year} (${h.bsYear}) · ${h.location.en}`,
      url: `/learn/${h.hazard}`,
      hazard: h.hazard,
      badge: `${h.year}`,
      keywords: [
        h.title.en,
        h.title.ne,
        h.location.en,
        h.location.ne,
        String(h.year),
        h.bsYear,
        h.hazard,
      ],
    }));

    return [
      ...emergencyItems,
      ...actionItems,
      ...navItems,
      ...guideItems,
      ...highwayItems,
      ...districtItems,
      ...historyItems,
    ];
  }, [locale, router, tnav, thaz]);

  // Tokenized multi-term search filtering
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Default view: top emergency, actions, primary navigation, and guides
      return allItems.filter(
        (item) =>
          item.category === "emergency" ||
          item.category === "action" ||
          item.category === "navigation" ||
          item.category === "guide",
      );
    }

    const tokens = q.split(/\s+/).filter(Boolean);

    return allItems
      .filter((item) => {
        const searchable = [
          item.title,
          item.subtitle ?? "",
          item.badge ?? "",
          item.phone ?? "",
          item.url ?? "",
          ...(item.keywords ?? []),
        ]
          .join(" ")
          .toLowerCase();

        return tokens.every((token) => searchable.includes(token));
      })
      .slice(0, 16);
  }, [allItems, query]);

  // Handle selection (dialing, actions, routing)
  const handleSelect = (item: PaletteItem) => {
    onClose();
    if (item.phone) {
      window.location.href = `tel:${item.phone}`;
      return;
    }
    if (item.action) {
      item.action();
      return;
    }
    if (item.url) {
      startTransition(() => {
        router.push(item.url!);
      });
    }
  };

  // Keyboard navigation within results
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = filtered[selectedIndex];
      if (current) handleSelect(current);
    }
  };

  // Keep selected element scrolled into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 backdrop-blur-sm sm:p-6 md:pt-20"
      onMouseDown={(e) => {
        isBackdropMouseDown.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (isBackdropMouseDown.current && e.target === e.currentTarget) {
          onClose();
        }
        isBackdropMouseDown.current = false;
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={locale === "ne" ? "सतर्क द्रुत खोजी तथा कमान्ड" : "Satarka Quick Command and Search"}
        className="flex h-dvh w-full max-w-xl flex-col border border-border sm:h-auto sm:max-h-[85vh] sm:rounded-3xl bg-surface text-text shadow-2xl overflow-hidden focus:outline-none"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
          <SearchIcon width={22} height={22} className="text-brand shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              locale === "ne"
                ? "जिल्ला, जानकारी वा नम्बर खोज्नुहोस्…"
                : "Search a district, guide or number…"
            }
            className="h-12 w-full bg-transparent text-lg text-text placeholder:text-muted focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="grid size-12 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text cursor-pointer"
              aria-label={locale === "ne" ? "खोजी खाली गर्नुहोस्" : "Clear query"}
            >
              <CloseIcon width={22} height={22} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block rounded border border-border bg-surface-2 px-1.5 py-0.5 text-sm font-mono text-muted">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <ul
          ref={listRef}
          role="listbox"
          className="overflow-y-auto p-2 divide-y divide-border/40 custom-scrollbar"
        >
          {filtered.length > 0 ? (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <li
                  key={item.id}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "flex min-h-16 items-center justify-between gap-3 rounded-chip px-3.5 py-3 text-left cursor-pointer transition-colors",
                    isSelected ? "bg-brand text-brand-fg" : "hover:bg-surface-2",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-chip border",
                        item.category === "emergency"
                          ? "border-warning/40 bg-warning/10 text-warning"
                          : item.category === "action"
                            ? "border-brand/40 bg-brand/10 text-brand"
                            : item.category === "district" || item.category === "highway"
                              ? "border-brand/40 bg-brand/10 text-brand"
                              : "border-border bg-surface text-muted",
                      )}
                    >
                      {item.category === "emergency" ? (
                        <PhoneIcon width={22} height={22} />
                      ) : item.category === "action" ? (
                        item.id === "action-theme" ? (
                          <MoonIcon width={22} height={22} />
                        ) : item.id === "action-language" ? (
                          <GlobeIcon width={22} height={22} />
                        ) : (
                          <SeverityGlyph severity="warning" width={22} height={22} />
                        )
                      ) : item.category === "district" ? (
                        <MapPinIcon width={22} height={22} />
                      ) : item.category === "highway" ? (
                        <HazardGlyph hazard="landslide" width={22} height={22} />
                      ) : item.hazard ? (
                        <HazardGlyph hazard={item.hazard} width={22} height={22} />
                      ) : (
                        <ArrowIcon width={20} height={20} />
                      )}
                    </span>

                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-lg font-semibold leading-snug",
                          isSelected ? "text-brand-fg" : "text-text",
                        )}
                      >
                        {item.title}
                      </p>
                      {item.subtitle ? (
                        <p
                          className={cn(
                            "text-base",
                            isSelected ? "text-brand-fg/80" : "text-muted",
                          )}
                        >
                          {item.subtitle}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Right pill / badge */}
                  {item.badge ? (
                    <span
                      className={cn(
                        "shrink-0 rounded-chip border px-2.5 py-1 text-base font-semibold tabular",
                        item.category === "emergency"
                          ? "border-warning/40 bg-warning/15 text-warning"
                          : isSelected
                            ? "border-brand-fg/30 bg-brand-fg/10 text-brand-fg"
                            : "border-border bg-surface-2 text-muted",
                      )}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </li>
              );
            })
          ) : (
            <li className="p-8 text-center text-lg text-muted">
              {locale === "ne"
                ? `"${query}" को लागि कुनै नतिजा भेटिएन। जिल्ला वा विपद्को नाम खोज्नुहोस्।`
                : `No results found for "${query}". Try searching districts, emergency numbers, or guides.`}
            </li>
          )}
        </ul>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-border bg-surface-2/50 px-4 py-2 text-sm text-muted">
          <div className="hidden sm:flex items-center gap-3">
            <span>
              <kbd className="rounded bg-surface px-1 py-0.5 border border-border">↑</kbd>{" "}
              <kbd className="rounded bg-surface px-1 py-0.5 border border-border">↓</kbd>{" "}
              {locale === "ne" ? "सार्नुहोस्" : "navigate"}
            </span>
            <span>
              <kbd className="rounded bg-surface px-1 py-0.5 border border-border">↵</kbd>{" "}
              {locale === "ne" ? "खोल्नुहोस्" : "select"}
            </span>
            <span>
              <kbd className="rounded bg-surface px-1 py-0.5 border border-border">ESC</kbd>{" "}
              {locale === "ne" ? "बन्द" : "close"}
            </span>
          </div>
          <span className="ml-auto">
            {locale === "ne" ? "सतर्क द्रुत कमान्ड" : "Satarka Quick Action"}
          </span>
        </div>
      </div>
    </div>
  );
}
