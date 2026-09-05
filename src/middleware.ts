import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Run on every path EXCEPT the locale-agnostic data API, Next internals,
  // and anything with a file extension (static assets, sw.js, manifest…).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
