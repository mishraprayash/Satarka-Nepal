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
export const THEME_EVENT = "satarka-theme-change";

/** Runs in <head> before first paint; must stay dependency-free and idempotent. */
export const themeBootScript = `(function(){try{
var t=localStorage.getItem('${THEME_KEY}');
if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
var d=document.documentElement;d.dataset.theme=t;
if(localStorage.getItem('${LOWBW_KEY}')==='true'){d.dataset.lowbw='true';}
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

/** Re-assert stored preferences on the <html> element (navigation-safe). */
export function applyStoredAppearance(): void {
  applyTheme(readTheme());
  const d = document.documentElement;
  try {
    d.dataset.lowbw = localStorage.getItem(LOWBW_KEY) === "true" ? "true" : "false";
  } catch {
    /* ignore */
  }
}

/** Subscribe to theme changes (local dispatch + other-tab writes). */
export function subscribeTheme(onChange: () => void): () => void {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
