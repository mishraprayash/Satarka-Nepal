import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowIcon } from "@/components/icons";

export default function NotFound() {
  const locale = useLocale();
  const tl = useTranslations("learn");

  return (
    <div className="shell flex min-h-[50vh] flex-col items-center justify-center py-16 text-center">
      <span className="rounded-full bg-brand/10 px-3.5 py-1 text-xs font-bold text-brand">
        404
      </span>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-text sm:text-3xl">
        {locale === "ne" ? "पृष्ठ फेला परेन" : "Page Not Found"}
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        {locale === "ne"
          ? "तपाईंले खोज्नुभएको प्रकोप गाइड वा पृष्ठ फेला परेन। कृपया सही लिङ्क प्रयोग गर्नुहोस्।"
          : "The disaster preparedness guide or page you are looking for does not exist or has been moved."}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 rounded-chip bg-brand px-4 py-2 text-sm font-semibold text-brand-fg hover:bg-brand-strong transition-colors"
        >
          <ArrowIcon width={14} height={14} className="rotate-180" />
          {tl("allHazards")}
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-chip border border-border px-4 py-2 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-text transition-colors"
        >
          {locale === "ne" ? "गृहपृष्ठ" : "Home"}
        </Link>
      </div>
    </div>
  );
}
