import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowIcon } from "@/components/icons";

export default function NotFound() {
  const locale = useLocale();
  const tl = useTranslations("learn");

  return (
    <div className="shell flex min-h-[50vh] flex-col items-center justify-center py-16 text-center">
      <span className="rounded-full bg-brand-soft px-4 py-1.5 text-lg font-bold text-brand">
        404
      </span>
      <h1 className="mt-4 text-3xl font-bold text-text sm:text-4xl">
        {locale === "ne" ? "पृष्ठ फेला परेन" : "Page Not Found"}
      </h1>
      <p className="mt-3 max-w-md text-lg text-muted">
        {locale === "ne"
          ? "तपाईंले खोज्नुभएको प्रकोप गाइड वा पृष्ठ फेला परेन। कृपया सही लिङ्क प्रयोग गर्नुहोस्।"
          : "The disaster preparedness guide or page you are looking for does not exist or has been moved."}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/learn"
          className="btn btn-primary"
        >
          <ArrowIcon width={18} height={18} className="rotate-180" />
          {tl("allHazards")}
        </Link>
        <Link
          href="/"
          className="btn btn-secondary"
        >
          {locale === "ne" ? "गृहपृष्ठ" : "Home"}
        </Link>
      </div>
    </div>
  );
}
