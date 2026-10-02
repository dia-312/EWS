import { getTranslations } from "next-intl/server";
import { ActiveFilters } from "@/components/storefront/active-filters";
import { FilterForm } from "@/components/storefront/catalog-filters";
import { EmptyState } from "@/components/storefront/empty-state";
import { FilterDrawer } from "@/components/storefront/filter-drawer";
import { Pagination } from "@/components/storefront/pagination";
import { ProductGrid } from "@/components/storefront/product-grid";
import { SortLinks } from "@/components/storefront/sort-links";
import { buttonClass } from "@/components/ui/button";
import type { Locale } from "@/config/i18n";
import { Link } from "@/i18n/navigation";
import { getBrands, getCategories, searchCatalog } from "@/lib/catalog";
import { activeFilterCount, toQueryString, type CatalogParams } from "@/lib/catalog-params";

type ProductListingProps = {
  locale: Locale;
  store: { id: string; currency_code: string };
  params: CatalogParams;
  /** Path of this listing without the locale: "/products" or "/categories/<slug>". */
  basePath: string;
  /** Set on a category page: results are limited to this category. */
  fixedCategoryId?: string;
};

/** Search results and category pages: filters, sort, grid and pagination. */
export async function ProductListing({
  locale,
  store,
  params,
  basePath,
  fixedCategoryId,
}: ProductListingProps) {
  const t = await getTranslations("store.listing");
  const [categories, brands] = await Promise.all([getCategories(store.id), getBrands(store.id)]);

  const categoryId =
    fixedCategoryId ?? categories.find((category) => category.slug === params.category)?.id ?? null;
  const brandIds = brands.filter((brand) => params.brands.includes(brand.slug)).map((brand) => brand.id);

  const result = await searchCatalog({ storeId: store.id, locale, params, categoryId, brandIds });
  const hideCategory = Boolean(fixedCategoryId);
  const filterProps = { locale, basePath, params, categories, brands, hideCategory };
  const filtersApplied = activeFilterCount(params);

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="hidden lg:block" aria-label={t("filters")}>
        <FilterForm {...filterProps} idPrefix="side" />
      </aside>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="text-sm text-muted">
            {t("results", { count: result.total })}
          </p>
          <div className="lg:hidden">
            <FilterDrawer activeCount={filtersApplied}>
              <FilterForm {...filterProps} idPrefix="drawer" />
            </FilterDrawer>
          </div>
        </div>

        <SortLinks basePath={basePath} params={params} />
        <ActiveFilters {...filterProps} currency={store.currency_code} />

        {result.items.length === 0 ? (
          <EmptyState title={t("noResults.title")} body={t("noResults.body")}>
            {filtersApplied > 0 && (
              <Link href={basePath} className={buttonClass("primary")}>
                {t("noResults.clear")}
              </Link>
            )}
          </EmptyState>
        ) : (
          <ProductGrid items={result.items} locale={locale} currency={store.currency_code} eager={4} />
        )}

        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          hrefFor={(page) => `${basePath}${toQueryString({ ...params, page })}`}
        />
      </div>
    </div>
  );
}
