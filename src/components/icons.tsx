import type { SVGProps } from "react";
import type { HazardType, Severity } from "@/lib/types";

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} satisfies SVGProps<SVGSVGElement>;

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function Svg({ title, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg {...base} aria-hidden={title ? undefined : true} role={title ? "img" : undefined} {...props}>
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

// ── Hazard glyphs ───────────────────────────────────────────────────────────
export function HazardGlyph({ hazard, ...props }: IconProps & { hazard: HazardType }) {
  switch (hazard) {
    case "flood":
      return (
        <Svg {...props}>
          <path d="M2 15c2 0 2-1.5 4-1.5S8 15 10 15s2-1.5 4-1.5S16 15 18 15s2-1.5 4-1.5" />
          <path d="M2 19c2 0 2-1.5 4-1.5S8 19 10 19s2-1.5 4-1.5S16 19 18 19s2-1.5 4-1.5" />
          <path d="M6 10.5 12 4l6 6.5" />
        </Svg>
      );
    case "glof":
      return (
        <Svg {...props}>
          <path d="m3 17 5.5-10L12 13l3-5 6 9Z" />
          <path d="M2 21c2 0 2-1.3 4-1.3S8 21 10 21s2-1.3 4-1.3S16 21 18 21s2-1.3 4-1.3" />
        </Svg>
      );
    case "earthquake":
      return (
        <Svg {...props}>
          <path d="M2 12h3l2-6 3.5 12L14 4l2.5 8H22" />
        </Svg>
      );
    case "landslide":
      return (
        <Svg {...props}>
          <path d="M3 20 15 5l6 15Z" />
          <circle cx="9" cy="17.5" r="1.1" />
          <circle cx="13" cy="18.5" r="1.1" />
          <circle cx="16.5" cy="16.5" r="1" />
        </Svg>
      );
  }
}

// ── Severity glyphs (distinct shapes — never rely on colour alone) ──────────
export function SeverityGlyph({ severity, ...props }: IconProps & { severity: Severity }) {
  switch (severity) {
    case "info":
      return (
        <Svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </Svg>
      );
    case "advisory":
      return (
        <Svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4l2.5 2.5" />
        </Svg>
      );
    case "watch":
      return (
        <Svg {...props}>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
          <circle cx="12" cy="12" r="2.5" />
        </Svg>
      );
    case "warning":
      return (
        <Svg {...props}>
          <path d="M10.3 3.2 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.2a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4M12 17h.01" />
        </Svg>
      );
    case "danger":
      return (
        <Svg {...props}>
          <path d="M8.6 2.5h6.8L21.5 8.6v6.8L15.4 21.5H8.6L2.5 15.4V8.6Z" />
          <path d="M12 8v4.5M12 16h.01" />
        </Svg>
      );
  }
}

// ── UI glyphs ───────────────────────────────────────────────────────────────
export const SunIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
);
export const MoonIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </Svg>
);
export const GlobeIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
  </Svg>
);
export const SignalIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20v-4M9 20v-8M14 20v-12M19 20V5" />
  </Svg>
);
export const MenuIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </Svg>
);
export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);
export const ExternalIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 3h6v6M21 3l-9 9M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
  </Svg>
);
export const ArrowIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);
export const PhoneIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L18 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 4 6a2 2 0 0 1 0-2Z" />
  </Svg>
);
export const MapPinIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </Svg>
);
export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </Svg>
);


