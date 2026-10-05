import type { Locale } from "@/i18n/routing";

const DIGITS = "०१२३४५६७८९";
const dev = (s: string) => s.replace(/\d/g, (d) => DIGITS[Number(d)]);

/** Ordered: first match wins, so the most specific causes come first. */
const CAUSES: [RegExp, string][] = [
  [/glof/i, "हिमताल विस्फोट बाढी"],
  [/retaining wall|washout/i, "पर्खाल भत्किएर सडक बगेको"],
  [/debris/i, "पहाडबाट लेदो/माटो बगेको"],
  [/rock/i, "चट्टान खसेको"],
  [/tree/i, "रुख ढलेको"],
  [/flood/i, "बाढी"],
  [/accident/i, "सडक दुर्घटना"],
  [/rain/i, "भारी वर्षा"],
  [/landslide/i, "पहिरो"],
];

/**
 * DOR closure reasons arrive as free-form English. Show a Nepali phrase for the
 * causes we recognise and fall back to the original text rather than guessing.
 */
export function localizeClosureReason(reason: string, locale: Locale): string {
  if (locale !== "ne") return reason;
  const hit = CAUSES.find(([re]) => re.test(reason));
  return hit ? hit[1] : reason;
}

const UNITS: Record<string, string> = { minute: "मिनेट", hour: "घण्टा", day: "दिन", week: "हप्ता" };

/** "3 hours" → "३ घण्टा". Unknown shapes pass through unchanged. */
export function localizeRepairEta(eta: string, locale: Locale): string {
  if (locale !== "ne") return eta;
  const m = /^\s*(\d+)\s*(minute|hour|day|week)s?\s*$/i.exec(eta);
  return m ? `${dev(m[1])} ${UNITS[m[2].toLowerCase()]}` : eta;
}
