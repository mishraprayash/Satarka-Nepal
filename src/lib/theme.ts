/**
 * Theme + low-bandwidth state, client-side only.
 *
 * localStorage is the single source of truth, and the theme is carried on the
 * <html> element's `data-theme` attribute — NOT a CSS class. This matters:
 * React 19's head management rewrites `class` on <html> during locale/navigation
 * re-renders (dropping a "dark" class and flashing the light theme), but it
 * leaves data-* attributes alone, so the theme survives every soft navigation.
 *
 * The boot script (`themeBootScript`) is injected into the server-rendered
 * <head> so the theme is applied BEFORE first paint; the toggles then read/write
 * the same store via useSyncExternalStore. <AppearanceSync> re-asserts stored
 * appearance after any navigation as a belt-and-suspenders guard.
 */
export type Theme = "light" | "dark";

export const THEME_KEY = "satarka-theme";
export const LOWBW_KEY = "satarka-lowbw";
export type TextSize = "normal" | "large" | "xlarge";
export const TEXTSIZE_KEY = "satarka-textsize";
export const TEXTSIZE_EVENT = "satarka-textsize-change";
export const TEXT_SIZES: TextSize[] = ["normal", "large", "xlarge"];

export const THEME_EVENT = "satarka-theme-change";
export const LOWBW_EVENT = "satarka-lowbw-change";

/** Runs in <head> before first paint; must stay dependency-free and idempotent. */
export const themeBootScript = `(function(){try{
var t=localStorage.getItem('${THEME_KEY}');
if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
var d=document.documentElement;d.dataset.theme=t;
d.dataset.lowbw=localStorage.getItem('${LOWBW_KEY}')==='true'?'true':'false';
var s=localStorage.getItem('${TEXTSIZE_KEY}');
d.dataset.textsize=(s==='large'||s==='xlarge')?s:'normal';
}catch(e){}})();`;

export function readTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === "light" || t === "dark") return t;
  } catch {
    /* ignore */
  }
  try {
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function readLowBandwidth(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = localStorage.getItem(LOWBW_KEY);
    if (v !== null) return v === "true";
  } catch {
    /* ignore */
  }
  return typeof document !== "undefined" && document.documentElement.dataset.lowbw === "true";
}

export function applyTheme(theme: Theme): void {
  // data-theme is preserved by React across soft navigations; a class is not.
  document.documentElement.dataset.theme = theme;
}

export function setTheme(theme: Theme): void {
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new Event(THEME_EVENT));
  } catch {
    /* ignore */
  }
}

export function setLowBandwidth(enabled: boolean): void {
  document.documentElement.dataset.lowbw = enabled ? "true" : "false";
  try {
    localStorage.setItem(LOWBW_KEY, String(enabled));
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new Event(LOWBW_EVENT));
  } catch {
    /* ignore */
  }
}

export function readTextSize(): TextSize {
  try {
    const v = localStorage.getItem(TEXTSIZE_KEY);
    if (v === "large" || v === "xlarge") return v;
  } catch {
    /* ignore */
  }
  return "normal";
}

export function setTextSize(size: TextSize): void {
  document.documentElement.dataset.textsize = size;
  try {
    localStorage.setItem(TEXTSIZE_KEY, size);
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new Event(TEXTSIZE_EVENT));
  } catch {
    /* ignore */
  }
}

export function subscribeTextSize(onChange: () => void): () => void {
  window.addEventListener(TEXTSIZE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(TEXTSIZE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Re-assert stored preferences on the <html> element (navigation-safe). */
export function applyStoredAppearance(): void {
  applyTheme(readTheme());
  const d = document.documentElement;
  try {
    d.dataset.lowbw = localStorage.getItem(LOWBW_KEY) === "true" ? "true" : "false";
  } catch {
    /* ignore */
  }
  d.dataset.textsize = readTextSize();
}

/** Subscribe to theme changes (local dispatch + other-tab writes + OS color scheme changes). */
export function subscribeTheme(onChange: () => void): () => void {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);

  const mq =
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;

  const onMediaChange = () => {
    try {
      if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(readTheme());
        onChange();
      }
    } catch {
      /* ignore */
    }
  };

  mq?.addEventListener?.("change", onMediaChange);

  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
    mq?.removeEventListener?.("change", onMediaChange);
  };
}

/** Subscribe to low-bandwidth toggle changes across instances and tabs. */
export function subscribeLowBandwidth(onChange: () => void): () => void {
  window.addEventListener(LOWBW_EVENT, onChange);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === LOWBW_KEY || e.key === null) {
      if (typeof document !== "undefined") {
        document.documentElement.dataset.lowbw = localStorage.getItem(LOWBW_KEY) === "true" ? "true" : "false";
      }
      onChange();
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(LOWBW_EVENT, onChange);
    window.removeEventListener("storage", handleStorage);
  };
}
