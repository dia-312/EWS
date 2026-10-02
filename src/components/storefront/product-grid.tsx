import { ProductCard } from "@/components/storefront/product-card";
import type { Locale } from "@/config/i18n";
import type { CatalogItem } from "@/lib/catalog";

export function ProductGrid({
  items,
  locale,
  currency,
  eager = 0,
}: {
  items: CatalogItem[];
  locale: Locale;
  currency: string;
  /** How many of the first cards to load eagerly. */
  eager?: number;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {items.map((item, index) => (
        <li key={item.id} className="flex">
          <ProductCard item={item} locale={locale} currency={currency} priority={index < eager} />
        </li>
      ))}
    </ul>
  );
}
