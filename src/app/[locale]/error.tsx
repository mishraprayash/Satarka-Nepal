"use client";

import { useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { SeverityGlyph } from "@/components/icons";

/**
 * Route-level error boundary. Catches render/runtime crashes in any page under
 * [locale] — including the Leaflet map, which can throw on unexpected geometry
 * — so a single broken component degrades to a clean recovery card instead of a blank
 * screen on a safety tool.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  let errorMessage = "Something went wrong";
  let retryText = "Try again";
  let homeText = "Return to Home";

  try {
    const tc = useTranslations("common");
    const ta = useTranslations("actions");
    const tn = useTranslations("nav");
    errorMessage = tc("error");
    retryText = ta("retry");
    homeText = tn("home");
  } catch {
    // If translation provider is impaired, keep safe fallback text
  }

  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  function handleReset() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <div className="shell py-16 sm:py-24">
      <div className="card mx-auto flex max-w-md flex-col items-center text-center gap-4 p-6 sm:p-8 border-border">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning-soft text-warning border border-warning/30">
          <SeverityGlyph severity="warning" className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-bold text-text">{errorMessage}</h2>
          <p className="text-xs sm:text-sm text-muted">
            {error.message && error.message !== "An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest was provided instead."
              ? error.message
              : "An unexpected error occurred while loading this view."}
          </p>
          {error.digest ? (
            <p className="font-mono text-[10px] text-faint">ID: {error.digest}</p>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            disabled={isPending}
            className="rounded-chip bg-brand px-4 py-2 text-sm font-semibold text-brand-fg hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            {isPending ? "…" : retryText}
          </button>
          <Link
            href="/"
            className="rounded-chip border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-2 transition-colors"
          >
            {homeText}
          </Link>
        </div>
      </div>
    </div>
  );
}
