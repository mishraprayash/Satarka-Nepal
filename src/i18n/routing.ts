import { defineRouting } from "next-intl/routing";

/**
 * Two fully-authored locales. English is complete; Nepali carries the
 * high-priority, safety-critical strings now with the remainder staged for a
 * native reviewer (never machine-translated for anything life-safety related).
 */
export const routing = defineRouting({
  locales: ["en", "ne"],
  defaultLocale: "en",
  // Both locales are always prefixed (/en, /ne) so a shared/pasted link is
  // unambiguous about which language a person will land in.
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
