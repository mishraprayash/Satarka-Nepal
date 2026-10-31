"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Horizontal tab row that keeps the current tab (aria-current="page") in view
 * on narrow screens, where the row scrolls sideways.
 */
export function TabScroller({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    ref.current
      ?.querySelector<HTMLElement>('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, []);

  return (
    <nav ref={ref} aria-label={label} className={className}>
      {children}
    </nav>
  );
}
