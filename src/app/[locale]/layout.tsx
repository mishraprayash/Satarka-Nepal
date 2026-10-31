import type { Metadata, Viewport } from "next";
import { Mukta } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { AppearanceSync, ThemeBoot } from "@/components/settings-controls";
import { GlobalNav } from "@/components/global-nav";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "../globals.css";

// One family for both scripts, self-hosted by next/font (no third-party request).
const mukta = Mukta({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-mukta",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: { default: t("title"), template: "%s · Satarka" },
    description: t("description"),
    applicationName: "Satarka",
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: "Satarka", statusBarStyle: "default" },
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1221" },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();
  const t = await getTranslations("nav");

  return (
    <html lang={locale} className={mukta.variable} suppressHydrationWarning>
      <body className="min-h-dvh antialiased flex flex-col justify-between">
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <ThemeBoot />
            <ServiceWorkerRegister />
            <AppearanceSync />
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-chip focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-fg"
            >
              {t("skip")}
            </a>
            <GlobalNav />
            <main id="main" className="flex-1">{children}</main>
            <SiteFooter />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
