import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TrackSearch } from "@/components/storefront/tracker";
import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { ProductListing } from "@/components/storefront/product-listing";
import { locales } from "@/config/i18n";
import { parseCatalogParams } from "@/lib/catalog-params";
import { absoluteUrl } from "@/lib/storefront";
import { getStorefront } from "@/lib/storefront-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }: PageProps<"/[locale]/products">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "store.listing" });
  const search = parseCatalogParams(await searchParams);

  return {
    title: search.q ? t("searchTitle", { query: search.q }) : t("allProducts"),
    alternates: {
      canonical: absoluteUrl(locale, "/products"),
      languages: Object.fromEntries(locales.map((value) => [value, absoluteUrl(value, "/products")])),
    },
    // Filtered and searched views are for visitors, not for search engines.
    robots: search.q || search.page > 1 ? { index: false, follow: true } : undefined,
  };
}

export default async function ProductsPage({ params, searchParams }: PageProps<"/[locale]/products">) {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();
  setRequestLocale(locale);

  const [t, { store }, rawParams] = await Promise.all([
    getTranslations("store.listing"),
    getStorefront(),
    searchParams,
  ]);
  const catalogParams = parseCatalogParams(rawParams);
  const tNav = await getTranslations("store.nav");

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: tNav("home"), href: "/" }, { label: t("allProducts") }]} />
      <h1 className="text-3xl font-bold">{catalogParams.q ? t("searchTitle", { query: catalogParams.q }) : t("allProducts")}</h1>
      {catalogParams.q && <TrackSearch query={catalogParams.q} />}
      <ProductListing locale={locale} store={store} params={catalogParams} basePath="/products" />
    </div>
  );
}
