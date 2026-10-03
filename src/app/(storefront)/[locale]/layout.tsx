import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { AiAssistantEntry } from "@/components/storefront/ai-assistant";
import { CompareTray } from "@/components/storefront/compare-tray";
import { Footer } from "@/components/storefront/footer";
import { Header } from "@/components/storefront/header";
import { ContactClickTracker, PageViewTracker } from "@/components/storefront/tracker";
import { ServiceWorkerRegister } from "@/components/storefront/pwa";
import { ShopHydrator } from "@/components/storefront/shop-hydrator";
import { ShopToast } from "@/components/storefront/shop-toast";
import { getDirection, locales } from "@/config/i18n";
import "@/lib/font-faces";
import { pickLocalized } from "@/lib/format";
import { absoluteUrl, siteUrl } from "@/lib/storefront";
import { getStorefront } from "@/lib/storefront-data";
import { getStoreTheme, getStoreThemeStyle } from "@/lib/theme";
import "../../globals.css";

// Only /ar and /en exist; any other first segment is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) return {};

  const { store, settings } = await getStorefront();
  const description =
    settings?.seo_description || pickLocalized(locale, settings?.about_text_ar, settings?.about_text_en);

  return {
    metadataBase: new URL(siteUrl()),
    title: { default: settings?.seo_title || store.name, template: `%s | ${store.name}` },
    description: description || undefined,
    alternates: {
      canonical: absoluteUrl(locale),
      languages: Object.fromEntries(locales.map((value) => [value, absoluteUrl(value)])),
    },
    openGraph: { siteName: store.name, locale, type: "website" },
    icons: { apple: "/pwa-icon/apple-180" },
    appleWebApp: { capable: true, title: store.name, statusBarStyle: "default" },
  };
}

/** The browser bar takes the store's color on phones. */
export async function generateViewport(): Promise<Viewport> {
  return { themeColor: (await getStoreTheme()).colors.primary };
}

/** Root layout of the public site: the language comes from the URL. */
export default async function StorefrontRootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();
  setRequestLocale(locale);

  const [{ store, settings, categories }, themeStyle, messages, t] = await Promise.all([
    getStorefront(),
    getStoreThemeStyle(),
    getMessages(),
    getTranslations("store.nav"),
  ]);

  // Visitors never need the admin strings.
  const publicMessages = { store: messages.store, specs: messages.specs };

  return (
    <html lang={locale} dir={getDirection(locale)} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={publicMessages}>
          <div className="theme-root flex flex-1 flex-col bg-surface text-foreground" style={themeStyle}>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
            >
              {t("skip")}
            </a>
            <Header
              locale={locale}
              store={store}
              categories={categories}
              whatsapp={settings?.whatsapp ?? null}
            />
            <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
              {children}
            </main>
            <Footer locale={locale} store={store} settings={settings} />
            <AiAssistantEntry />
            <CompareTray />
            <ShopToast />
            <ShopHydrator />
            <PageViewTracker />
            <ServiceWorkerRegister />
            <ContactClickTracker />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
