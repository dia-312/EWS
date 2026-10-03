import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { getDirection, type Locale } from "@/config/i18n";
import "@/lib/font-faces";
import "../globals.css";

export const metadata: Metadata = {
  title: "EWS Admin",
  robots: { index: false, follow: false },
};

/** Root layout of the admin area: its language comes from a cookie, not the URL. */
export default async function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  const locale = (await getLocale()) as Locale;

  return (
    <html lang={locale} dir={getDirection(locale)} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
