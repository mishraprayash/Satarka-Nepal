import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function SectionHeader({
  eyebrow,
  title,
  sub,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        {sub ? <p className="mt-2 text-muted">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}
