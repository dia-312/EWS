import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/storefront/page-header";
import { FavoritesView } from "@/components/storefront/favorites-view";
import { locales } from "@/config/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/favorites">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "store.favorites" });
  // Personal to the visitor's browser: nothing for search engines to index.
  return { title: t("title"), robots: { index: false, follow: true } };
}

export default async function FavoritesPage({ params }: PageProps<"/[locale]/favorites">) {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();
  setRequestLocale(locale);

  const [t, tNav] = await Promise.all([getTranslations("store.favorites"), getTranslations("store.nav")]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader crumbs={[{ label: tNav("home"), href: "/" }, { label: t("title") }]} title={t("title")} description={t("intro")} />
      <FavoritesView />
    </div>
  );
}
