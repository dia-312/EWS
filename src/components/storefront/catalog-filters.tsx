import { useTranslations } from "next-intl";
import { Button, buttonClass } from "@/components/ui/button";
import type { Locale } from "@/config/i18n";
import { Link } from "@/i18n/navigation";
import type { Brand, Category } from "@/lib/catalog";
import {
  AVAILABILITY_VALUES,
  activeFilterCount,
  toQueryString,
  type CatalogParams,
} from "@/lib/catalog-params";
import { pickLocalized } from "@/lib/format";

type FilterFormProps = {
  locale: Locale;
  /** Path of the listing without the locale, e.g. "/products" or "/categories/mobiles". */
  basePath: string;
  params: CatalogParams;
  categories: Category[];
  brands: Brand[];
  /** On a category page the category is fixed and not offered as a filter. */
  hideCategory?: boolean;
  /** Distinguishes the two copies of the form (sidebar and mobile drawer). */
  idPrefix: string;
};

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:bg-background focus-visible:ring-2 focus-visible:ring-primary/40";

export function FilterForm({
  locale,
  basePath,
  params,
  categories,
  brands,
  hideCategory = false,
  idPrefix,
}: FilterFormProps) {
  const t = useTranslations("store.filters");
  const tAvail = useTranslations("store.availability");
  const hasFilters = activeFilterCount(params) > 0;
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <form action={`/${locale}${basePath}`} method="get" className="flex flex-col gap-5" aria-label={t("title")}>
      {params.q && <input type="hidden" name="q" value={params.q} />}
      {params.sort !== "newest" && <input type="hidden" name="sort" value={params.sort} />}

      {!hideCategory && categories.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-extrabold">{t("category")}</legend>
          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 text-sm transition-colors hover:bg-primary-soft">
            <input type="radio" name="category" value="" defaultChecked={!params.category} className="size-4 accent-primary" />
            {t("allCategories")}
          </label>
          {categories.map((category) => (
            <label key={category.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 text-sm transition-colors hover:bg-primary-soft">
              <input
                type="radio"
                name="category"
                value={category.slug}
                defaultChecked={params.category === category.slug}
                className="size-4 accent-primary"
              />
              {pickLocalized(locale, category.name_ar, category.name_en)}
            </label>
          ))}
        </fieldset>
      )}

      {brands.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-extrabold">{t("brand")}</legend>
          {brands.map((brand) => (
            <label key={brand.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 text-sm transition-colors hover:bg-primary-soft">
              <input
                type="checkbox"
                name="brand"
                value={brand.slug}
                defaultChecked={params.brands.includes(brand.slug)}
                className="size-4 accent-primary"
              />
              {brand.name}
            </label>
          ))}
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-extrabold">{t("price")}</legend>
        <div className="flex items-center gap-2" dir="ltr">
          <label htmlFor={id("min")} className="sr-only">
            {t("minPrice")}
          </label>
          <input
            id={id("min")}
            name="min"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder={t("minPrice")}
            defaultValue={params.min ?? ""}
            className={inputClass}
          />
          <span aria-hidden>–</span>
          <label htmlFor={id("max")} className="sr-only">
            {t("maxPrice")}
          </label>
          <input
            id={id("max")}
            name="max"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder={t("maxPrice")}
            defaultValue={params.max ?? ""}
            className={inputClass}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-extrabold">{t("availability")}</legend>
        {AVAILABILITY_VALUES.map((value) => (
          <label key={value} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="availability"
              value={value}
              defaultChecked={params.availability.includes(value)}
              className="size-4 accent-primary"
            />
            {tAvail(value)}
          </label>
        ))}
      </fieldset>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="sale" value="1" defaultChecked={params.onSale} className="size-4 accent-primary" />
        {t("onSale")}
      </label>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1 rounded-xl">
          {t("apply")}
        </Button>
        {hasFilters && (
          <Link
            href={`${basePath}${toQueryString({ sort: params.sort })}`}
            className={buttonClass("secondary")}
          >
            {t("clearAll")}
          </Link>
        )}
      </div>
    </form>
  );
}
