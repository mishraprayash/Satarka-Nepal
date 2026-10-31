import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DisclaimerTrigger } from "@/components/disclaimer-trigger";

/** Grouped by what someone is trying to do, not by how the site is built. */
const GROUPS = [
  {
    title: "groupInformed",
    links: [
      { href: "/alerts", key: "alerts" },
      { href: "/map", key: "map" },
      { href: "/highways", key: "highways" },
    ],
  },
  {
    title: "groupReady",
    links: [
      { href: "/learn", key: "learn" },
      { href: "/report", key: "report" },
      { href: "/about", key: "about" },
    ],
  },
] as const;

export async function SiteFooter() {
  const [t, nav, te] = await Promise.all([
    getTranslations("footer"),
    getTranslations("nav"),
    getTranslations("emergency"),
  ]);

  const hotlines = [
    { n: "100", label: te("police") },
    { n: "102", label: te("ambulance") },
    { n: "101", label: te("fire") },
    { n: "1149", label: te("ndrrma") },
  ];

  return (
    <footer className="mt-20 bg-surface pb-mobile-nav lg:pb-0">
      {/* The most useful thing a footer can hold on a safety site: numbers that dial on tap */}
      <section aria-labelledby="footer-call" className="border-y border-border bg-surface-2">
        <div className="shell flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
          <h2 id="footer-call" className="text-lg font-bold">
            {t("callTitle")}
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:flex md:gap-3">
            {hotlines.map((h) => (
              <li key={h.n}>
                <a
                  href={`tel:${h.n}`}
                  className="flex min-h-12 items-baseline gap-2 rounded-chip border border-border-strong bg-surface px-4 py-2.5 hover:border-danger-solid"
                >
                  <span className="tabular text-xl font-extrabold text-danger">{h.n}</span>
                  <span className="text-sm text-muted">{h.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="shell grid gap-10 py-12 md:grid-cols-[1.6fr_1fr_1fr]">
        <div className="max-w-md">
          <p className="flex items-baseline gap-2">
            <span lang="ne" className="text-2xl font-extrabold text-brand">
              सतर्क
            </span>
            <span className="text-lg font-bold">Satarka</span>
          </p>
          <p className="mt-3 text-base leading-relaxed text-muted">{t("notOfficial")}</p>
          <DisclaimerTrigger label={t("disclaimerShort")} actionText={t("readFullDisclaimer")} />
        </div>

        {GROUPS.map((g) => (
          <nav key={g.title} aria-label={t(g.title)}>
            <h2 className="text-base font-bold">{t(g.title)}</h2>
            <ul className="mt-2">
              {g.links.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="inline-block py-2 text-base text-muted hover:text-text hover:underline underline-offset-4">
                    {nav(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="shell flex flex-col gap-2 py-5 text-sm text-faint md:flex-row md:items-center md:justify-between">
          <p>{t("dataCredit")}</p>
          <p>© {new Date().getFullYear()} Satarka</p>
        </div>
      </div>
    </footer>
  );
}
