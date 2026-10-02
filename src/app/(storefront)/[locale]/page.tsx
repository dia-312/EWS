import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { HomeSections } from "@/components/storefront/home-sections";
import { locales } from "@/config/i18n";
import { getStorefront } from "@/lib/storefront-data";

// Rendered on every request so edits in the admin show up immediately.
export const dynamic = "force-dynamic";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();
  setRequestLocale(locale);

  const { store, settings, categories } = await getStorefront();
  return <HomeSections locale={locale} store={store} settings={settings} categories={categories} />;
}
