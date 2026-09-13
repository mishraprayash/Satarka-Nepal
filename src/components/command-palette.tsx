"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { NEPAL_DISTRICTS } from "@/lib/districts";
import { HISTORIC_DISASTERS } from "@/lib/disaster-history";
import {
  CloseIcon,
  HazardGlyph,
  MapPinIcon,
  PhoneIcon,
  SearchIcon,
  ArrowIcon,
} from "@/components/icons";

interface PaletteItem {
  category: "emergency" | "navigation" | "guide" | "highway" | "district" | "history";
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  url?: string;
  phone?: string;
  hazard?: "flood" | "glof" | "earthquake" | "landslide";
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

  const tnav = useTranslations("nav");
  const thaz = useTranslations("hazards");

  // Focus input when opened and lock body scroll
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
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose]);

  // Static datasets
  const allItems: PaletteItem[] = useMemo(() => {
    const isNe = locale === "ne";

    const emergencyItems: PaletteItem[] = [
      {
        id: "em-police",
        category: "emergency",
        title: isNe ? "नेपाल प्रहरी" : "Nepal Police",
        subtitle: isNe ? "आपतकालीन सेवा" : "Emergency Police Response",
        phone: "100",
        badge: "100",
      },
      {
        id: "em-fire",
        category: "emergency",
        title: isNe ? "दमकल (अग्नि नियन्त्रक)" : "Fire Brigade",
        subtitle: isNe ? "आगो तथा उद्धार" : "Fire & Rescue Operations",
        phone: "101",
        badge: "101",
      },
      {
        id: "em-amb",
        category: "emergency",
        title: isNe ? "एम्बुलेन्स सेवा" : "Ambulance Service",
        subtitle: isNe ? "स्वास्थ्य तथा प्राथमिक उपचार" : "Medical Emergency Transport",
        phone: "102",
        badge: "102",
      },
      {
        id: "em-ndrrma",
        category: "emergency",
        title: isNe ? "विपद् व्यवस्थापन हटलाइन (NDRRMA)" : "NDRRMA Disaster Hotline",
        subtitle: isNe ? "राष्ट्रिय विपद् जोखिम न्यूनीकरण" : "National Disaster Response Authority",
        phone: "1234",
        badge: "1234",
      },
    ];

    const navItems: PaletteItem[] = [
      {
        id: "nav-alerts",
        category: "navigation",
        title: tnav("alerts"),
        subtitle: isNe ? "सक्रिय बाढी, पहिरो तथा भूकम्प सूचनाहरू" : "Active multi-hazard verified alerts",
        url: "/alerts",
        badge: "LIVE",
      },
      {
        id: "nav-map",
        category: "navigation",
        title: tnav("map"),
        subtitle: isNe ? "नदी स्टेशन, भूकम्पीय क्षेत्र र हिमताल नक्सा" : "Hydrological gauges, fault lines, glacial lakes",
        url: "/map",
      },
      {
        id: "nav-highways",
        category: "navigation",
        title: isNe ? "राष्ट्रिय राजमार्ग" : "National Highways",
        subtitle: isNe ? "सडक विभागबाट प्रत्यक्ष सडक अवरोध तथा आवागमन" : "Real-time road blockages, landslides, repair ETAs",
        url: "/highways",
        badge: "ROAD",
      },
      {
        id: "nav-learn",
        category: "navigation",
        title: tnav("learn"),
        subtitle: isNe ? "विपद् पूर्वतयारी तथा सुरक्षा उपायहरू" : "Preparedness guides & historical data",
        url: "/learn",
      },
      {
        id: "nav-about",
        category: "navigation",
        title: tnav("about"),
        subtitle: isNe ? "उद्देश्य, डेटा स्रोत र आपतकालीन सम्पर्क" : "Mission, methodology & emergency contacts",
        url: "/about",
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
      },
      {
        id: "guide-glof",
        category: "guide",
        title: thaz("glof.name"),
        subtitle: thaz("glof.short"),
        url: "/learn/glof",
        hazard: "glof",
      },
      {
        id: "guide-earthquake",
        category: "guide",
        title: thaz("earthquake.name"),
        subtitle: thaz("earthquake.short"),
        url: "/learn/earthquake",
        hazard: "earthquake",
      },
      {
        id: "guide-landslide",
        category: "guide",
        title: thaz("landslide.name"),
        subtitle: thaz("landslide.short"),
        url: "/learn/landslide",
        hazard: "landslide",
      },
    ];

    const districtItems: PaletteItem[] = NEPAL_DISTRICTS.map((d) => ({
      id: `dist-${d.id}`,
      category: "district",
      title: isNe ? d.ne : d.en,
      subtitle: isNe ? `जिल्ला · नक्सामा हेर्नुहोस्` : `District · View on Hazard Map`,
      url: `/map?lat=${d.lat}&lng=${d.lng}&zoom=11&title=${encodeURIComponent(isNe ? d.ne : d.en)}`,
      badge: `${d.lat.toFixed(1)}°N, ${d.lng.toFixed(1)}°E`,
    }));

    const highwayItems: PaletteItem[] = [
      {
        id: "hw-nh44",
        category: "highway",
        title: isNe ? "पृथ्वी राजमार्ग (NH44 / मुग्लिङ-काठमाडौं)" : "Prithvi Highway (NH44 / Mugling-Kathmandu)",
        subtitle: isNe ? "मुख्य आपूर्ति मार्ग · प्रत्यक्ष अवरोध स्थिति" : "Critical supply lifeline · Real-time road status",
        url: "/highways",
        badge: "NH44",
      },
      {
        id: "hw-nh08",
        category: "highway",
        title: isNe ? "बी.पी. राजमार्ग (NH08 / बनेपा-सिन्धुली-बर्दिबास)" : "BP Highway (NH08 / Banepa-Sindhuli-Bardibas)",
        subtitle: isNe ? "पूर्वी नेपाल जोड्ने द्रुतमार्ग · पहिरो निगरानी" : "Eastern corridor expressway · Landslide monitoring",
        url: "/highways",
        badge: "NH08",
      },
      {
        id: "hw-nh47",
        category: "highway",
        title: isNe ? "सिद्धार्थ राजमार्ग (NH47 / बुटवल-पाल्पा-पोखरा)" : "Siddhartha Highway (NH47 / Butwal-Palpa-Pokhara)",
        subtitle: isNe ? "सिद्धबाबा खण्ड तथा पाल्पा पहिरो क्षेत्र" : "Siddhababa section & Palpa landslide transit",
        url: "/highways",
        badge: "NH47",
      },
      {
        id: "hw-nh41",
        category: "highway",
        title: isNe ? "त्रिभुवन राजपथ (NH41 / नौबिसे-दामन-हेटौंडा)" : "Tribhuvan Highway (NH41 / Naubise-Daman-Hetauda)",
        subtitle: isNe ? "ऐतिहासिक पहाडी सडक मार्ग" : "Historic mountain transit route",
        url: "/highways",
        badge: "NH41",
      },
      {
        id: "hw-nh58",
        category: "highway",
        title: isNe ? "कर्णाली राजमार्ग (NH58 / सुर्खेत-जुम्ला)" : "Karnali Highway (NH58 / Surkhet-Jumla)",
        subtitle: isNe ? "कर्णाली करिडोर · पहिरो जोखिम अनुगमन" : "Karnali corridor · Landslide vulnerability monitoring",
        url: "/highways",
        badge: "NH58",
      },
      {
        id: "hw-nh01",
        category: "highway",
        title: isNe ? "पूर्व-पश्चिम राजमार्ग (NH01 / महेन्द्र राजमार्ग)" : "East-West Highway (NH01 / Mahendra Highway)",
        subtitle: isNe ? "तराई लाइफलाइन · बाढी तथा पुल डाइभर्सन" : "Terai arterial lifeline · Flood & bridge diversions",
        url: "/highways",
        badge: "NH01",
      },
      {
        id: "hw-nh03",
        category: "highway",
        title: isNe ? "पुष्पलाल मध्यपहाडी राजमार्ग (NH03)" : "Pushpalal Mid-Hill Highway (NH03)",
        subtitle: isNe ? "मध्यपहाडी लोकमार्ग खण्डहरू" : "Mid-hill trans-Nepal connector",
        url: "/highways",
        badge: "NH03",
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
    }));

    return [...emergencyItems, ...navItems, ...guideItems, ...highwayItems, ...districtItems, ...historyItems];
  }, [locale, tnav, thaz]);

  // Filter items
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Return top emergency, primary navigation, and guides
      return allItems.filter(
        (item) => item.category === "emergency" || item.category === "navigation" || item.category === "guide",
      );
    }

    return allItems
      .filter((item) => {
        const title = item.title.toLowerCase();
        const sub = item.subtitle?.toLowerCase() ?? "";
        const badge = item.badge?.toLowerCase() ?? "";
        const phone = item.phone ?? "";
        return title.includes(q) || sub.includes(q) || badge.includes(q) || phone.includes(q);
      })
      .slice(0, 16);
  }, [allItems, query]);

  // Handle selection
  const handleSelect = (item: PaletteItem) => {
    onClose();
    if (item.phone) {
      window.location.href = `tel:${item.phone}`;
      return;
    }
    if (item.url) {
      startTransition(() => {
        router.push(item.url!);
      });
    }
  };

  // Keyboard navigation
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
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 md:pt-20 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick Command and Search"
        className="flex flex-col w-full max-w-xl max-h-[85vh] rounded-2xl border border-border bg-surface text-text shadow-2xl overflow-hidden focus:outline-none"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <SearchIcon width={18} height={18} className="text-brand shrink-0" />
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
                ? "जिल्ला, आपतकालीन नम्बर, गाइड वा नक्सा खोज्नुहोस्…"
                : "Search districts, emergency numbers, guides, or map…"
            }
            className="w-full bg-transparent text-sm sm:text-base text-text placeholder:text-muted focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="rounded-chip p-1 text-muted hover:text-text"
              aria-label="Clear query"
            >
              <CloseIcon width={16} height={16} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] font-mono text-faint">
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
                    "flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left cursor-pointer transition-colors",
                    isSelected ? "bg-brand text-brand-fg" : "hover:bg-surface-2",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                        item.category === "emergency"
                          ? "border-warning/40 bg-warning/10 text-warning"
                          : item.category === "district" || item.category === "highway"
                            ? "border-brand/40 bg-brand/10 text-brand"
                            : "border-border bg-surface text-muted",
                      )}
                    >
                      {item.category === "emergency" ? (
                        <PhoneIcon width={15} height={15} />
                      ) : item.category === "district" ? (
                        <MapPinIcon width={15} height={15} />
                      ) : item.category === "highway" ? (
                        <HazardGlyph hazard="landslide" width={15} height={15} />
                      ) : item.hazard ? (
                        <HazardGlyph hazard={item.hazard} width={15} height={15} />
                      ) : (
                        <ArrowIcon width={14} height={14} />
                      )}
                    </span>

                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-sm font-semibold truncate",
                          isSelected ? "text-brand-fg" : "text-text",
                        )}
                      >
                        {item.title}
                      </p>
                      {item.subtitle ? (
                        <p
                          className={cn(
                            "text-xs truncate",
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
                        "shrink-0 rounded-chip border px-2 py-0.5 text-[11px] font-mono font-semibold tabular",
                        item.category === "emergency"
                          ? "border-warning/40 bg-warning/15 text-warning"
                          : isSelected
                            ? "border-brand-fg/30 bg-brand-fg/10 text-brand-fg"
                            : "border-border bg-surface-2 text-faint",
                      )}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </li>
              );
            })
          ) : (
            <li className="p-8 text-center text-sm text-muted">
              {locale === "ne"
                ? `"${query}" को लागि कुनै नतिजा भेटिएन।`
                : `No results found for "${query}". Try typing a district or hazard name.`}
            </li>
          )}
        </ul>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-border bg-surface-2/50 px-4 py-2 text-[11px] text-faint">
          <div className="hidden sm:flex items-center gap-3">
            <span>
              <kbd className="rounded bg-surface px-1 py-0.5 border border-border">↑</kbd>{" "}
              <kbd className="rounded bg-surface px-1 py-0.5 border border-border">↓</kbd> navigate
            </span>
            <span>
              <kbd className="rounded bg-surface px-1 py-0.5 border border-border">↵</kbd> select
            </span>
          </div>
          <span className="ml-auto">
            {locale === "ne" ? "सतर्क द्रुत खोजी" : "Satarka Quick Action"}
          </span>
        </div>
      </div>
    </div>
  );
}
