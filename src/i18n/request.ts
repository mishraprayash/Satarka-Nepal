import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import en from "../messages/en.json";

type Messages = typeof en;
type Dict = { [k: string]: string | Dict };

/**
 * Overlay translated strings on top of the complete English catalog. Any key
 * not yet translated falls back to English — an honest scaffold, never a
 * machine translation of safety-critical text.
 */
function deepMerge(base: Dict, over: Dict): Dict {
  const out: Dict = { ...base };
  for (const key of Object.keys(over)) {
    const b = base[key];
    const o = over[key];
    out[key] =
      typeof b === "object" && typeof o === "object" && b && o
        ? deepMerge(b as Dict, o as Dict)
        : o;
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  let messages = en as unknown as Messages;
  if (locale !== routing.defaultLocale) {
    const overlay = (await import(`../messages/${locale}.json`)).default as Dict;
    messages = deepMerge(en as unknown as Dict, overlay) as unknown as Messages;
  }

  return { locale, messages };
});
