import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { CompareFallback } from "@/components/storefront/compare-bits";
import { CompareTable } from "@/components/storefront/compare-table";
import { EmptyState } from "@/components/storefront/empty-state";
import { buttonClass } from "@/components/ui/button";
import { locales } from "@/config/i18n";
import { Link } from "@/i18n/navigation";
import { getProductsForCompare } from "@/lib/catalog";
import { MAX_COMPARE, parseIdList } from "@/lib/shop-state";
import { getStorefront } from "@/lib/storefront-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/compare">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "store.compare" });
  // The list is chosen by the visitor: nothing for search engines to index.
  return { title: t("title"), robots: { index: false, follow: true } };
}

export default async function ComparePage({ params, searchParams }: PageProps<"/[locale]/compare">) {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();
  setRequestLocale(locale);

  const [t, tNav, { store }, query] = await Promise.all([
    getTranslations("store.compare"),
    getTranslations("store.nav"),
    getStorefront(),
    searchParams,
  ]);

  const ids = parseIdList(query.ids, MAX_COMPARE);
  const products = ids.length > 0 ? await getProductsForCompare(store.id, ids) : [];

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: tNav("home"), href: "/" }, { label: t("title") }]} />
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("intro", { max: MAX_COMPARE })}</p>
      </div>

      {ids.length === 0 ? (
        <CompareFallback />
      ) : products.length === 0 ? (
        <EmptyState title={t("gone.title")} body={t("gone.body")}>
          <Link href="/products" className={buttonClass("primary")}>
            {t("empty.browse")}
          </Link>
        </EmptyState>
      ) : (
        <>
          {products.length < 2 && (
            <p role="status" className="rounded-lg border border-border bg-background px-4 py-3 text-sm">
              {t("needTwo")}{" "}
              <Link href="/products" className="font-medium text-primary underline underline-offset-2">
                {t("empty.browse")}
              </Link>
            </p>
          )}
          <CompareTable products={products} locale={locale} currency={store.currency_code} />
        </>
      )}
    </div>
  );
}
