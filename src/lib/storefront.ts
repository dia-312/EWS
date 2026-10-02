import type { Locale } from "@/config/i18n";
import { pickLocalized } from "@/lib/format";

/** Absolute public URL of the site (no trailing slash), for canonical links and sharing. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function absoluteUrl(locale: Locale, path = ""): string {
  return `${siteUrl()}/${locale}${path}`;
}

/** The small, comparable subset of a product the card and price blocks need. */
export type PriceInfo = {
  price: number;
  offerPrice: number | null;
  offerOldPrice: number | null;
};

/** What the visitor pays now, and the struck-through price when an offer applies. */
export function currentPrice({ price, offerPrice, offerOldPrice }: PriceInfo) {
  if (offerPrice === null) return { current: price, was: null, discountPercent: null };

  const was = offerOldPrice ?? price;
  const discountPercent = was > offerPrice && was > 0 ? Math.round(((was - offerPrice) / was) * 100) : null;
  return { current: offerPrice, was: was > offerPrice ? was : null, discountPercent };
}

/** How long a product counts as "new" after it was added. Same rule as search_products(). */
export const NEW_PRODUCT_DAYS = 30;

/** An explicit owner choice wins; otherwise a product is new for 30 days after creation. */
export function isNewProduct(
  createdAt: string,
  override: boolean | null,
  now: Date = new Date(),
): boolean {
  if (override !== null) return override;
  return now.getTime() - new Date(createdAt).getTime() < NEW_PRODUCT_DAYS * 86_400_000;
}

export function localizedName(
  locale: Locale,
  item: { name_ar: string; name_en: string | null },
) {
  return pickLocalized(locale, item.name_ar, item.name_en);
}
