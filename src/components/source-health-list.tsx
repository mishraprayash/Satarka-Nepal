"use client";

import { useLocale, useTranslations } from "next-intl";
import type { SourceHealth } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/format";
import { STATUS_DOT, STATUS_KEY } from "@/lib/ui";
import { ExternalIcon } from "@/components/icons";

export function SourceHealthList({ sources }: { sources: SourceHealth[] }) {
  const locale = useLocale() as Locale;
  const ts = useTranslations("status");
  const tc = useTranslations("common");
  const ta = useTranslations("alerts");

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {sources.map((s) => {
        const note = s.note ? (locale === "ne" ? s.note.ne ?? s.note.en : s.note.en) : null;
        return (
          <li key={s.id} className="card p-4">
            <div className="flex items-center gap-2">
              <span
                className={cn("size-2 rounded-full", s.ok ? STATUS_DOT[s.status] : "bg-danger")}
                aria-hidden
              />
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold hover:text-brand"
              >
                {s.name}
                <ExternalIcon width={12} height={12} />
              </a>
              <span className={cn("eyebrow ml-auto", !s.ok && "text-danger")}>
                {s.ok ? ts(`${STATUS_KEY[s.status]}.label`) : tc("unavailableShort")}
              </span>
            </div>

            <p className="mt-2 text-sm text-muted">
              {s.ok ? (
                <>
                  {typeof s.scanned === "number" ? tc("recordsChecked", { count: s.scanned }) : null}
                  {typeof s.scanned === "number" && s.surfaced > 0 ? " · " : null}
                  {s.surfaced > 0 ? tc("itemsSurfaced", { count: s.surfaced }) : null}
                  {typeof s.scanned !== "number" && s.surfaced === 0 ? ts(`${STATUS_KEY[s.status]}.desc`) : null}
                </>
              ) : (
                <span className="text-danger">{ta("unavailable")}</span>
              )}
            </p>

            {note ? <p className="mt-1 text-xs text-faint">{note}</p> : null}

            <p className="mt-2 text-xs text-faint" suppressHydrationWarning>
              {tc("checkedAgo", { time: timeAgo(s.fetchedAt, locale) })}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
