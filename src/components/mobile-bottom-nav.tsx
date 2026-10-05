"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { CloseIcon, MapPinIcon, SearchIcon } from "@/components/icons";
import { SettingsPanel } from "@/components/settings-controls";
import { isActive } from "@/components/site-header";

type GlyphProps = { size?: number };

function Glyph({ children, size = 26 }: GlyphProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const HomeGlyph = () => (
  <Glyph>
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </Glyph>
);
const BellGlyph = () => (
  <Glyph>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Glyph>
);
const BookGlyph = () => (
  <Glyph>
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
    <path d="M6 6h10M6 10h10" />
  </Glyph>
);
const MoreGlyph = () => (
  <Glyph>
    <circle cx="5" cy="12" r="1.2" />
    <circle cx="12" cy="12" r="1.2" />
    <circle cx="19" cy="12" r="1.2" />
  </Glyph>
);

const MORE_LINKS = [
  { href: "/report", key: "report", hint: "reportHint" },
  { href: "/highways", key: "highways", hint: "highwaysHint" },
  { href: "/about", key: "about", hint: "aboutHint" },
] as const;

export function MobileBottomNav({ onOpenSearch }: { onOpenSearch: () => void }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => setMoreOpen(false), [pathname]);
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const tabs = [
    { href: "/", label: t("home"), icon: <HomeGlyph /> },
    { href: "/alerts", label: t("alerts"), icon: <BellGlyph /> },
    { href: "/map", label: t("map"), icon: <MapPinIcon width={26} height={26} /> },
    { href: "/learn", label: t("learn"), icon: <BookGlyph /> },
  ];
  const moreActive = MORE_LINKS.some((l) => isActive(pathname, l.href));

  const tabClass = (active: boolean) =>
    cn(
      "flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-sm font-semibold transition-colors cursor-pointer",
      active ? "text-brand" : "text-muted hover:text-text",
    );

  return (
    <>
      {moreOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={t("more")}>
          <button type="button" aria-label={t("close")} className="absolute inset-0 bg-black/50" onClick={() => setMoreOpen(false)} />
          <div
            className="animate-drawer-bottom card-elevated absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-b-none p-5"
            style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">{t("more")}</h2>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label={t("close")} className="grid size-11 place-items-center rounded-full hover:bg-surface-2 cursor-pointer">
                <CloseIcon width={22} height={22} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                onOpenSearch();
              }}
              className="mb-3 flex w-full items-center gap-3 rounded-chip border border-border-strong px-4 py-3.5 text-left text-lg font-medium cursor-pointer"
            >
              <SearchIcon width={22} height={22} className="text-muted" />
              {t("searchPlaceholder")}
            </button>
            <ul className="mb-6 divide-y divide-border rounded-chip border border-border">
              {MORE_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="flex flex-col px-4 py-3.5 hover:bg-surface-2">
                    <span className="text-lg font-semibold">{t(l.key)}</span>
                    <span className="text-sm text-muted">{t(l.hint)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <SettingsPanel />
          </div>
        </div>
      ) : null}

      <nav
        aria-label={t("mobileNav")}
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 backdrop-blur-lg lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex h-[4.5rem] items-stretch">
          {tabs.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined} className={tabClass(active)}>
                <span className={cn("grid h-8 w-14 place-items-center rounded-full transition-colors", active && "bg-brand-soft")}>{tab.icon}</span>
                <span>{tab.label}</span>
              </Link>
            );
          })}
          <button type="button" onClick={() => setMoreOpen((v) => !v)} aria-expanded={moreOpen} className={tabClass(moreActive || moreOpen)}>
            <span className={cn("grid h-8 w-14 place-items-center rounded-full transition-colors", (moreActive || moreOpen) && "bg-brand-soft")}>
              <MoreGlyph />
            </span>
            <span>{t("more")}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
