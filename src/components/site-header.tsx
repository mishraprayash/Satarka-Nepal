"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { SearchIcon } from "@/components/icons";
import { EmergencyMenu, LanguageToggle, SettingsMenu } from "@/components/settings-controls";

/**
 * Places to look, in the order people need them. Home is the logo, About lives
 * in the footer. Reporting is an action, so it sits apart as a button.
 */
export const PRIMARY_NAV = [
  { href: "/alerts", key: "alerts" },
  { href: "/map", key: "map" },
  { href: "/highways", key: "highways" },
  { href: "/learn", key: "learn" },
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
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-xl">
      <div className="shell flex h-16 items-stretch justify-between gap-3">
        <div className="flex min-w-0 items-stretch gap-8">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 self-center rounded-chip"
            aria-label="Satarka — home"
          >
            <span lang="ne" className="text-[1.75rem] font-extrabold leading-none text-brand">
              सतर्क
            </span>
            <span className="hidden text-lg font-bold leading-none min-[400px]:inline">Satarka</span>
          </Link>

          <nav className="hidden items-stretch gap-1 lg:flex" aria-label="Primary">
            {PRIMARY_NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center px-3 text-base whitespace-nowrap transition-colors",
                    // The current page is marked by a bar on the header's bottom edge.
                    "after:absolute after:inset-x-3 after:-bottom-px after:h-[3px] after:rounded-t-full",
                    active
                      ? "font-bold text-text after:bg-brand"
                      : "font-medium text-muted hover:text-text after:bg-transparent",
                  )}
                >
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenSearch}
            className="hidden h-11 items-center gap-2 rounded-chip px-3 text-base font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text cursor-pointer lg:inline-flex"
            aria-label={t("search")}
          >
            <SearchIcon width={18} height={18} />
            <span className="hidden xl:inline">{t("search")}</span>
            <kbd suppressHydrationWarning className="hidden rounded-md border border-border px-1.5 text-sm text-faint 2xl:inline">
              {shortcutKey}
            </kbd>
          </button>
          <div className="hidden lg:block">
            <SettingsMenu />
          </div>
          <LanguageToggle />
          <Link
            href="/report"
            aria-current={isActive(pathname, "/report") ? "page" : undefined}
            className="btn btn-secondary hidden !min-h-11 !px-4 lg:inline-flex"
          >
            {t("report")}
          </Link>
          <EmergencyMenu />
        </div>
      </div>
    </header>
  );
}
