"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useServerInsertedHTML } from "next/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { GlobeIcon, MoonIcon, SignalIcon, SunIcon } from "@/components/icons";
import {
  LOWBW_KEY,
  applyStoredAppearance,
  TEXT_SIZES,
  readLowBandwidth,
  readTextSize,
  readTheme,
  setLowBandwidth,
  setTextSize,
  setTheme,
  subscribeLowBandwidth,
  subscribeTextSize,
  subscribeTheme,
  themeBootScript,
  type TextSize,
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
    "inline-flex items-center justify-center gap-1.5 rounded-chip border px-3 h-11 min-w-11 text-base font-medium transition-colors cursor-pointer",
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

const SIZE_LABEL_CLASS: Record<TextSize, string> = {
  normal: "text-sm",
  large: "text-lg",
  xlarge: "text-2xl",
};

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; className?: string; ariaLabel?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          aria-label={o.ariaLabel}
          className={cn(
            "rounded-chip border px-3 font-semibold transition-colors cursor-pointer",
            o.className ?? "text-base",
            value === o.value
              ? "border-brand bg-brand-soft text-brand"
              : "border-border text-text hover:bg-surface-2",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** One friendly "Display" panel: text size, light/dark, low-data. Replaces three loose icon buttons. */
export function SettingsPanel() {
  const t = useTranslations("settings");
  const size = useSyncExternalStore(subscribeTextSize, readTextSize, () => "normal" as const);
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as const);
  const low = useSyncExternalStore(subscribeLowBandwidth, readLowBandwidth, () => false);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="font-semibold">{t("textSize")}</p>
        <Segmented
          label={t("textSize")}
          value={size}
          onChange={setTextSize}
          options={TEXT_SIZES.map((v) => ({
            value: v,
            label: "A",
            className: SIZE_LABEL_CLASS[v],
            ariaLabel: t(v),
          }))}
        />
      </div>
      <div className="space-y-2">
        <p className="font-semibold">{t("theme")}</p>
        <Segmented
          label={t("theme")}
          value={theme}
          onChange={setTheme}
          options={[
            { value: "light", label: t("light") },
            { value: "dark", label: t("dark") },
          ]}
        />
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={low}
        onClick={() => setLowBandwidth(!low)}
        className="flex w-full items-center justify-between gap-4 rounded-chip border border-border p-3 text-left hover:bg-surface-2 cursor-pointer"
      >
        <span>
          <span className="block font-semibold">{t("lowData")}</span>
          <span className="block text-sm text-muted">{t("lowDataHint")}</span>
        </span>
        <span
          aria-hidden
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full transition-colors",
            low ? "bg-brand" : "bg-border-strong",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-6 rounded-full bg-white shadow transition-all",
              low ? "left-[1.375rem]" : "left-0.5",
            )}
          />
        </span>
      </button>
    </div>
  );
}

/** Desktop "Display" popover wrapping the settings panel. */
export function SettingsMenu() {
  const t = useTranslations("settings");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className={control(open)}
      >
        <span aria-hidden className="font-bold leading-none">
          A<span className="text-sm">A</span>
        </span>
        <span>{t("title")}</span>
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={t("title")}
          className="card-elevated absolute right-0 top-full z-50 mt-2 w-[22rem] p-5"
        >
          <SettingsPanel />
        </div>
      ) : null}
    </div>
  );
}

/** Always-reachable emergency numbers. One tap to open, one tap to call. */
export function EmergencyMenu() {
  const t = useTranslations("emergency");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const numbers = [
    { n: "100", label: t("police") },
    { n: "102", label: t("ambulance") },
    { n: "101", label: t("fire") },
    { n: "1149", label: t("ndrrma") },
    { n: "1155", label: t("dhm") },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="btn btn-emergency !min-h-11 !px-4"
      >
        <PhoneGlyph />
        <span>{t("title")}</span>
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={t("title")}
          className="card-elevated absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] p-3"
        >
          <p className="px-2 pb-2 pt-1 text-sm text-muted">{t("subtitle")}</p>
          <ul className="space-y-1.5">
            {numbers.map((x) => (
              <li key={x.n}>
                <a
                  href={`tel:${x.n}`}
                  className="flex items-center justify-between gap-3 rounded-chip px-3 py-3 hover:bg-surface-2"
                >
                  <span className="font-medium">{x.label}</span>
                  <span className="tabular text-xl font-bold text-danger">{x.n}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function PhoneGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}
