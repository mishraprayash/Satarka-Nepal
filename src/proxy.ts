import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next 16 renamed the middleware file convention to "proxy"; next-intl's
// handler works unchanged under the new name.

export default createMiddleware(routing);

export const config = {
  // Run on every path EXCEPT the locale-agnostic data API, Next internals,
  // and anything with a file extension (static assets, sw.js, manifest…).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
