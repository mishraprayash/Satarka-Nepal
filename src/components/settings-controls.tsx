"use client";

import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useServerInsertedHTML } from "next/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { GlobeIcon, MoonIcon, SignalIcon, SunIcon } from "@/components/icons";
import {
  LOWBW_KEY,
  applyStoredAppearance,
  readLowBandwidth,
  readTheme,
  setLowBandwidth,
  setTheme,
  subscribeLowBandwidth,
  subscribeTheme,
  themeBootScript,
} from "@/lib/theme";

/**
 * Injects the theme boot script into the SSR <head> (runs before first paint)
 * WITHOUT rendering a <script> in the client React tree. Next re-invokes the
 * registered callback at each streaming flush point, so the ref guard keeps the
 * emission idempotent. On the client the hook is a no-op: React never warns and
 * locale/navigation re-renders never re-execute the script.
 */
export function ThemeBoot() {
  const emitted = useRef(false);
  useServerInsertedHTML(() => {
    if (emitted.current) return <></>;
    emitted.current = true;
    return <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />;
  });
  return null;
}

function control(active = false) {
  return cn(
    "inline-flex items-center justify-center gap-1.5 rounded-chip border px-2.5 h-9 text-sm font-medium transition-colors",
    "border-border text-muted hover:text-text hover:bg-surface-2",
    active && "text-brand border-brand/40 bg-brand-soft",
  );
}

export function LanguageToggle() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const other = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;
  const label = other === "ne" ? "नेपाली" : "English";

  const handleToggle = () => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const target = `${pathname}${search}${hash}`;
    router.replace(target, { locale: other });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={control()}
      lang={other}
      aria-label={
        locale === "ne"
          ? `Switch language to ${label}`
          : `भाषा ${label} मा परिवर्तन गर्नुहोस्`
      }
      title={label}
    >
      <GlobeIcon width={16} height={16} />
      {label}
    </button>
  );
}

export function ThemeToggle() {
  const t = useTranslations("actions");
  // Server snapshot stays "light" so hydration matches; after mount the store
  // re-reads localStorage and corrects the icon without touching the <html>
  // class (already applied by the boot script).
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as const);

  function toggle() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={control()}
      aria-label={t("toggleTheme")}
      title={t("toggleTheme")}
      suppressHydrationWarning
    >
      {theme === "dark" ? <MoonIcon width={16} height={16} /> : <SunIcon width={16} height={16} />}
    </button>
  );
}

export function LowBandwidthToggle({ showLabel = false }: { showLabel?: boolean }) {
  const t = useTranslations("actions");
  const low = useSyncExternalStore(subscribeLowBandwidth, readLowBandwidth, () => false);

  function toggle() {
    setLowBandwidth(!low);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={control(low)}
      aria-pressed={low}
      title={t("lowBandwidth")}
      aria-label={t("lowBandwidth")}
      suppressHydrationWarning
    >
      <SignalIcon width={16} height={16} />
      {showLabel ? <span>{t("lowBandwidth")}</span> : <span className="sr-only">{t("lowBandwidth")}</span>}
    </button>
  );
}

/**
 * Navigation-safe appearance guard. During a locale/navigation re-render React
 * rewrites <html> and drops `data-theme`, which would flash the light theme for
 * one frame. We therefore re-assert in useLayoutEffect — it runs synchronously
 * in the same commit, BEFORE the browser paints — so the stored theme is applied
 * before any light frame can appear. Renders nothing.
 */
export function AppearanceSync() {
  const locale = useLocale();
  const pathname = usePathname();
  useLayoutEffect(() => {
    applyStoredAppearance();
  }, [locale, pathname]);
  return null;
}
