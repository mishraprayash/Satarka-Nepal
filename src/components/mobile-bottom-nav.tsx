"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import {
  HazardGlyph,
  MapPinIcon,
  SearchIcon,
  PhoneIcon,
} from "@/components/icons";

function HomeGlyph({ width = 20, height = 20 }: { width?: number; height?: number }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function BellGlyph({ width = 20, height = 20 }: { width?: number; height?: number }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function BookGlyph({ width = 20, height = 20 }: { width?: number; height?: number }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
      <path d="M6 6h10M6 10h10" />
    </svg>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function MobileBottomNav({ onOpenSearch }: { onOpenSearch: () => void }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const NAV_ITEMS = [
    { href: "/", label: t("home"), icon: <HomeGlyph width={20} height={20} /> },
    { href: "/alerts", label: t("alerts"), icon: <BellGlyph width={20} height={20} /> },
    { href: "/map", label: t("map"), icon: <MapPinIcon width={20} height={20} /> },
    { href: "/learn", label: t("learn"), icon: <BookGlyph width={20} height={20} /> },
    { href: "/about", label: t("about"), icon: <PhoneIcon width={20} height={20} /> },
  ] as const;

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface/92 backdrop-blur-lg md:hidden transition-transform duration-200"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-16 px-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 px-1 text-center transition-colors min-w-[54px] min-h-[44px]",
                active ? "text-brand font-semibold" : "text-muted hover:text-text",
              )}
            >
              <span className={cn("relative flex items-center justify-center p-1 rounded-full transition-transform active:scale-95", active && "bg-brand/10")}>
                {item.icon}
                {active && (
                  <span className="absolute -bottom-1 size-1 rounded-full bg-brand" aria-hidden="true" />
                )}
              </span>
              <span className="text-[10.5px] leading-tight tracking-tight mt-0.5 truncate max-w-[62px]">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Quick Search Button in dock */}
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Quick Search"
          className="flex flex-col items-center justify-center gap-0.5 py-1 px-1 text-center text-muted hover:text-brand transition-colors min-w-[50px] min-h-[44px]"
        >
          <span className="flex items-center justify-center p-1 rounded-full transition-transform active:scale-95">
            <SearchIcon width={19} height={19} />
          </span>
          <span className="text-[10.5px] leading-tight tracking-tight mt-0.5">
            Search
          </span>
        </button>
      </div>
    </nav>
  );
}
