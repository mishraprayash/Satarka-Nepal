"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { useAlerts } from "@/lib/use-alerts";
import { CloseIcon, MenuIcon, SearchIcon } from "@/components/icons";
import {
  LanguageToggle,
  LowBandwidthToggle,
  ThemeToggle,
} from "@/components/settings-controls";

const NAV = [
  { href: "/", key: "home" },
  { href: "/alerts", key: "alerts" },
  { href: "/map", key: "map" },
  { href: "/learn", key: "learn" },
  { href: "/about", key: "about" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SiteHeader({ onOpenSearch }: { onOpenSearch?: () => void }) {
  const t = useTranslations("nav");
  const ta = useTranslations("alerts");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const { response } = useAlerts();

  // Compute live threat status indicator
  const threatStatus = useMemo(() => {
    if (!response) return null;
    const alerts = response.alerts ?? [];
    const hasDanger = alerts.some((a) => a.severity === "danger");
    const hasWarning = alerts.some((a) => a.severity === "warning");

    if (hasDanger) {
      return {
        level: "danger" as const,
        label: locale === "ne" ? "सक्रिय जोखिम चेतावनी" : "Active Danger Warning",
        dotClass: "bg-danger animate-ping",
        badgeClass: "border-danger/40 bg-danger/10 text-danger",
      };
    }
    if (hasWarning) {
      return {
        level: "warning" as const,
        label: locale === "ne" ? "सक्रिय सतर्कता चेतावनी" : "Active Warning",
        dotClass: "bg-warning animate-pulse",
        badgeClass: "border-warning/40 bg-warning/10 text-warning",
      };
    }
    return {
      level: "ok" as const,
      label: locale === "ne" ? "५ प्रत्यक्ष फिड सक्रिय" : "Feeds Active",
      dotClass: "bg-advisory",
      badgeClass: "border-border bg-surface-2/60 text-muted",
    };
  }, [response, locale]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="shell flex h-16 items-center justify-between gap-3 sm:gap-4">
        {/* Brand logo & Live status pill */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="group flex items-baseline gap-2 shrink-0 transition-opacity hover:opacity-90"
            aria-label="Satarka — home"
          >
            <span
              lang="ne"
              className="font-deva text-2xl font-bold leading-none text-brand"
              style={{ fontFamily: "var(--font-deva)" }}
            >
              सतर्क
            </span>
            <span className="text-lg font-bold tracking-tight text-text">Satarka</span>
          </Link>

          {/* Situational Status Pill */}
          {threatStatus ? (
            <Link
              href="/alerts"
              className={cn(
                "hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors hover:opacity-85",
                threatStatus.badgeClass,
              )}
            >
              <span className="relative flex size-2">
                <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", threatStatus.dotClass)} />
                <span
                  className={cn(
                    "relative inline-flex size-2 rounded-full",
                    threatStatus.level === "danger"
                      ? "bg-danger"
                      : threatStatus.level === "warning"
                        ? "bg-warning"
                        : "bg-advisory",
                  )}
                />
              </span>
              <span className="truncate">{threatStatus.label}</span>
            </Link>
          ) : null}
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-chip px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "text-brand font-semibold"
                    : "text-muted hover:text-text hover:bg-surface-2",
                )}
              >
                {t(item.key)}
                {active && (
                  <span className="absolute inset-x-3 -bottom-[17px] h-0.5 bg-brand rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Quick Search & Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Global Search Trigger button */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex items-center gap-2 rounded-chip border border-border bg-surface-2/70 px-2.5 py-1.5 text-xs font-medium text-muted hover:border-border-strong hover:text-text hover:bg-surface-2 transition-colors cursor-pointer"
            aria-label="Quick search (Press Command+K)"
          >
            <SearchIcon width={14} height={14} className="text-brand shrink-0" />
            <span className="hidden sm:inline">
              {locale === "ne" ? "खोज्नुहोस्…" : "Search…"}
            </span>
            <kbd className="hidden sm:inline-block rounded border border-border bg-surface px-1 py-0.5 text-[10px] font-mono text-faint">
              ⌘K
            </kbd>
          </button>

          {/* Settings Toggles */}
          <div className="hidden sm:flex items-center gap-1.5">
            <LowBandwidthToggle />
            <ThemeToggle />
            <LanguageToggle />
          </div>

          {/* Mobile only toggles (compact) */}
          <div className="flex items-center gap-1 sm:hidden">
            <LanguageToggle />
            <ThemeToggle />
          </div>

          {/* Mobile burger toggle for secondary links */}
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-chip border border-border text-muted md:hidden hover:bg-surface-2 transition-colors"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={t("menu")}
          >
            {open ? <CloseIcon width={18} height={18} /> : <MenuIcon width={18} height={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {open ? (
        <div className="border-t border-border bg-surface md:hidden animate-drawer-bottom shadow-lg">
          <nav className="shell grid gap-1 py-3" aria-label="Mobile Secondary Menu">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className={cn(
                  "rounded-chip px-3.5 py-2.5 text-sm font-medium transition-colors",
                  isActive(pathname, item.href)
                    ? "bg-brand-soft text-brand font-semibold"
                    : "text-muted hover:bg-surface-2 hover:text-text",
                )}
              >
                {t(item.key)}
              </Link>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-border pt-3 px-1 text-xs">
              <span className="text-faint">{ta("healthTitle")}</span>
              <LowBandwidthToggle />
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
