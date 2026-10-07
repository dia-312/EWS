import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/storefront/page-header";
import { ProductListing } from "@/components/storefront/product-listing";
import { locales } from "@/config/i18n";
import { parseCatalogParams } from "@/lib/catalog-params";
import { pickLocalized } from "@/lib/format";
import { absoluteUrl } from "@/lib/storefront";
import { getStorefront } from "@/lib/storefront-data";

export const dynamic = "force-dynamic";

async function findCategory(slug: string) {
  const { store, categories } = await getStorefront();
  return { store, category: categories.find((item) => item.slug === slug) };
}

export async function generateMetadata({ params }: PageProps<"/[locale]/categories/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(locales, locale)) return {};

  const { category } = await findCategory(slug);
  if (!category) return {};

  const path = `/categories/${slug}`;
  return {
    title: pickLocalized(locale, category.name_ar, category.name_en),
    description: pickLocalized(locale, category.description_ar, category.description_en) || undefined,
    alternates: {
      canonical: absoluteUrl(locale, path),
      languages: Object.fromEntries(locales.map((value) => [value, absoluteUrl(value, path)])),
    },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/[locale]/categories/[slug]">) {
  const { locale, slug } = await params;
  if (!hasLocale(locales, locale)) notFound();
  setRequestLocale(locale);

  const [{ store, category }, rawParams, tNav] = await Promise.all([
    findCategory(slug),
    searchParams,
    getTranslations("store.nav"),
  ]);
  if (!category) notFound();

  const name = pickLocalized(locale, category.name_ar, category.name_en);
  const description = pickLocalized(locale, category.description_ar, category.description_en);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        crumbs={[
          { label: tNav("home"), href: "/" },
          { label: tNav("allProducts"), href: "/products" },
          { label: name },
        ]}
        title={name}
        description={description || undefined}
      />
      <ProductListing
        locale={locale}
        store={store}
        params={parseCatalogParams({ ...rawParams, category: undefined })}
        basePath={`/categories/${slug}`}
        fixedCategoryId={category.id}
      />
    </div>
  );
}
