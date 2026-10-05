"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { SearchIcon } from "@/components/icons";
import { EmergencyMenu, LanguageToggle, SettingsMenu } from "@/components/settings-controls";

/** Primary destinations. Home is the logo; About lives in the footer / More menu. */
export const PRIMARY_NAV = [
  { href: "/alerts", key: "alerts" },
  { href: "/map", key: "map" },
  { href: "/learn", key: "learn" },
  { href: "/report", key: "report" },
  { href: "/highways", key: "highways" },
] as const;

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SiteHeader({ onOpenSearch }: { onOpenSearch?: () => void }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [shortcutKey, setShortcutKey] = useState("Ctrl+K");

  useEffect(() => {
    const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent);
    setShortcutKey(isMac ? "⌘K" : "Ctrl+K");
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-xl">
      <div className="shell flex h-16 items-center justify-between gap-3 sm:h-[4.5rem]">
        <div className="flex min-w-0 items-center gap-6 xl:gap-8">
          <Link
            href="/"
            className="flex shrink-0 items-baseline gap-2 rounded-chip"
            aria-label="Satarka — home"
          >
            <span lang="ne" className="text-2xl font-bold leading-none text-brand" style={{ fontFamily: "var(--font-deva)" }}>
              सतर्क
            </span>
            <span className="hidden text-xl font-bold tracking-tight min-[400px]:inline">Satarka</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {PRIMARY_NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-chip px-3.5 py-2.5 text-base font-medium whitespace-nowrap transition-colors",
                    active ? "bg-brand-soft font-semibold text-brand" : "text-muted hover:bg-surface-2 hover:text-text",
                  )}
                >
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenSearch}
            className="hidden h-11 items-center gap-2 rounded-chip border border-border px-3 text-base font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text cursor-pointer lg:inline-flex"
            aria-label={t("search")}
          >
            <SearchIcon width={18} height={18} />
            <span className="hidden xl:inline">{t("search")}</span>
            <kbd suppressHydrationWarning className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-sm text-faint 2xl:inline">
              {shortcutKey}
            </kbd>
          </button>
          <div className="hidden lg:block">
            <SettingsMenu />
          </div>
          <LanguageToggle />
          <EmergencyMenu />
        </div>
      </div>
    </header>
  );
}
