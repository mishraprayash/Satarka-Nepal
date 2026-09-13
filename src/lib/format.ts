import type { Locale } from "@/i18n/routing";

/** Locale tag actually understood by Intl (Nepali = "ne"). */
function intlLocale(locale: Locale): string {
  return locale === "ne" ? "ne-NP" : "en";
}

/**
 * "5 min ago" / "५ मिनेट पहिले". Falls back gracefully if the timestamp is
 * missing or unparseable rather than throwing in a render path.
 */
export function timeAgo(iso: string | null | undefined, locale: Locale, now = Date.now()): string {
  if (!iso) return locale === "ne" ? "थाहा छैन" : "unknown";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return locale === "ne" ? "थाहा छैन" : "unknown";

  const diffSec = Math.round((then - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto" });
  const abs = Math.abs(diffSec);

  if (abs < 60) return rtf.format(Math.round(diffSec), "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  return rtf.format(Math.round(diffSec / 86400), "day");
}

/** Localised absolute date-time, e.g. for "issued at". */
export function formatDateTime(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

/** Localised number (Devanagari digits for Nepali). */
export function formatNumber(n: number, locale: Locale, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(intlLocale(locale), opts).format(n);
}

/**
 * Safely resolves a bilingual text object ({ en, ne }) to the active locale,
 * falling back to English if the localized translation is not provided.
 */
export function localizeText(
  v: { en: string; ne?: string } | undefined | null,
  locale: Locale,
): string {
  if (!v) return "";
  return locale === "ne" ? v.ne ?? v.en : v.en;
}
