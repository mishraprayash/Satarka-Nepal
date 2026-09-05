"use client";

import { useTranslations } from "next-intl";
import type { HazardType, Severity, SourceStatus } from "@/lib/types";
import { cn } from "@/lib/cn";
import { HazardGlyph, SeverityGlyph } from "@/components/icons";
import { SEVERITY_CHIP, STATUS_DOT, STATUS_KEY } from "@/lib/ui";

/** Severity as colour + icon + word — the three-signal rule, always together. */
export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const t = useTranslations("severity");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-chip px-2 py-0.5 text-xs font-semibold",
        SEVERITY_CHIP[severity],
        className,
      )}
    >
      <SeverityGlyph severity={severity} width={13} height={13} />
      {t(`${severity}.label`)}
    </span>
  );
}

export function HazardChip({ hazard, className }: { hazard: HazardType; className?: string }) {
  const t = useTranslations("hazards");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-chip border border-border bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted",
        className,
      )}
    >
      <HazardGlyph hazard={hazard} width={13} height={13} />
      {t(`${hazard}.name`)}
    </span>
  );
}

/** Honest source-status pill: dot + label, colour-coded by feed nature. */
export function StatusBadge({ status, className }: { status: SourceStatus; className?: string }) {
  const t = useTranslations("status");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-chip border border-border px-2 py-0.5 text-xs font-medium text-muted",
        className,
      )}
      title={t(`${STATUS_KEY[status]}.desc`)}
    >
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} aria-hidden />
      {t(`${STATUS_KEY[status]}.label`)}
    </span>
  );
}
