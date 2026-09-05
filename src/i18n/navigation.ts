import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware navigation primitives. Always import Link/useRouter/etc. from
// here rather than from next/navigation so the active locale is preserved.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
