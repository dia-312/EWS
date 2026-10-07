import { useTranslations } from "next-intl";
import type { Locale } from "@/config/i18n";
import { Link } from "@/i18n/navigation";
import type { Brand, Category } from "@/lib/catalog";
import { toQueryString, type CatalogParams } from "@/lib/catalog-params";
import { formatPrice, pickLocalized } from "@/lib/format";

type ActiveFiltersProps = {
  locale: Locale;
  basePath: string;
  params: CatalogParams;
  categories: Category[];
  brands: Brand[];
  currency: string;
  hideCategory?: boolean;
};

/** One removable chip per applied filter, each linking to the same list without it. */
export function ActiveFilters({
  locale,
  basePath,
  params,
  categories,
  brands,
  currency,
  hideCategory = false,
}: ActiveFiltersProps) {
  const t = useTranslations("store.filters");
  const tAvail = useTranslations("store.availability");

  const without = (patch: Partial<CatalogParams>) => `${basePath}${toQueryString({ ...params, ...patch, page: 1 })}`;
  const chips: { key: string; label: string; href: string }[] = [];

  if (params.q) chips.push({ key: "q", label: `“${params.q}”`, href: without({ q: "" }) });

  const category = categories.find((item) => item.slug === params.category);
  if (!hideCategory && category) {
    chips.push({
      key: "category",
      label: pickLocalized(locale, category.name_ar, category.name_en),
      href: without({ category: "" }),
    });
  }

  for (const slug of params.brands) {
    const brand = brands.find((item) => item.slug === slug);
    if (brand) {
      chips.push({
        key: `brand-${slug}`,
        label: brand.name,
        href: without({ brands: params.brands.filter((value) => value !== slug) }),
      });
    }
  }

  if (params.min !== null || params.max !== null) {
    const from = params.min !== null ? formatPrice(params.min, currency, locale) : "…";
    const to = params.max !== null ? formatPrice(params.max, currency, locale) : "…";
    chips.push({ key: "price", label: `${from} – ${to}`, href: without({ min: null, max: null }) });
  }

  for (const value of params.availability) {
    chips.push({
      key: `availability-${value}`,
      label: tAvail(value),
      href: without({ availability: params.availability.filter((item) => item !== value) }),
    });
  }

  if (params.onSale) chips.push({ key: "sale", label: t("onSale"), href: without({ onSale: false }) });

  if (chips.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2" aria-label={t("applied")}>
      {chips.map((chip) => (
        <li key={chip.key}>
          <Link
            href={chip.href}
            className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-background px-3 py-1 text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary"
            aria-label={t("remove", { filter: chip.label })}
          >
            <span dir="auto">{chip.label}</span>
            <span aria-hidden>×</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
