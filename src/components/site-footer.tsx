import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DisclaimerTrigger } from "@/components/disclaimer-trigger";

const NAV = [
  { href: "/alerts", key: "alerts" },
  { href: "/map", key: "map" },
  { href: "/learn", key: "learn" },
  { href: "/about", key: "about" },
] as const;

export async function SiteFooter() {
  const [t, nav] = await Promise.all([getTranslations("footer"), getTranslations("nav")]);

  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="shell grid gap-10 py-12 md:grid-cols-[1.4fr_1fr]">
        <div className="max-w-md">
          <div className="flex items-baseline gap-2">
            <span lang="ne" className="text-xl text-brand" style={{ fontFamily: "var(--font-deva)" }}>
              सतर्क
            </span>
            <span className="text-base font-bold">Satarka</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">{t("notOfficial")}</p>
          <DisclaimerTrigger
            label={t("disclaimerShort")}
            actionText={t("readFullDisclaimer")}
          />
        </div>


        <nav aria-label="Footer" className="flex flex-col gap-2 text-sm md:items-end">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="text-muted hover:text-text">
              {nav(item.key)}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-border">
        <div className="shell flex flex-col gap-2 py-5 text-xs text-faint md:flex-row md:items-center md:justify-between">
          <p>{t("dataCredit")}</p>
          <p>© {new Date().getFullYear()} Satarka · सतर्क</p>
        </div>
      </div>
    </footer>
  );
}
