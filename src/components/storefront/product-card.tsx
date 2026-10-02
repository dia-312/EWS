import { useTranslations } from "next-intl";
import { AvailabilityBadge, ProductBadges } from "@/components/storefront/badges";
import { Price } from "@/components/storefront/price";
import type { Locale } from "@/config/i18n";
import { Link } from "@/i18n/navigation";
import type { CatalogItem } from "@/lib/catalog";
import { pickLocalized } from "@/lib/format";
import { thumbUrl } from "@/lib/images";
import { currentPrice, localizedName } from "@/lib/storefront";

type ProductCardProps = {
  item: CatalogItem;
  locale: Locale;
  currency: string;
  /** The first cards of a page load eagerly; the rest are lazy. */
  priority?: boolean;
};

export function ProductCard({ item, locale, currency, priority = false }: ProductCardProps) {
  const t = useTranslations("store");
  const name = localizedName(locale, item);
  const { current, was, discountPercent } = currentPrice({
    price: Number(item.price),
    offerPrice: item.offer_price === null ? null : Number(item.offer_price),
    offerOldPrice: item.offer_old_price === null ? null : Number(item.offer_old_price),
  });
  const unavailable = item.availability === "out_of_stock";
  const alt = pickLocalized(locale, item.image_alt_ar, item.image_alt_en) || name;

  return (
    <article className="group relative flex w-full flex-col overflow-hidden rounded-xl border border-border bg-background transition-shadow focus-within:ring-2 focus-within:ring-primary hover:shadow-md">
      <div className="relative aspect-square bg-surface">
        {item.image_url ? (
          // Plain <img>: the files are already resized and compressed at upload.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl(item.image_url)}
            alt={alt}
            width={480}
            height={480}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className={`size-full object-contain p-3 ${unavailable ? "opacity-60" : ""}`}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted" aria-hidden>
            <svg viewBox="0 0 24 24" className="size-12" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="9" cy="10" r="1.5" />
              <path d="m21 16-5-5-8 8" />
            </svg>
          </div>
        )}
        <ProductBadges
          className="absolute start-2 top-2"
          onSale={item.offer_price !== null}
          discountPercent={discountPercent}
          isNew={item.is_new}
          badgeKeys={item.badge_keys}
        />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {item.brand_name && <p className="text-xs text-muted">{item.brand_name}</p>}
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">
          <Link href={`/products/${item.slug}`} className="outline-none after:absolute after:inset-0">
            {name}
          </Link>
        </h3>
        <div className="mt-auto flex flex-col gap-1.5 pt-1">
          <Price current={current} was={was} currency={currency} locale={locale} />
          {item.availability !== "in_stock" ? (
            <AvailabilityBadge availability={item.availability} className="self-start" />
          ) : (
            <span className="sr-only">{t("availability.in_stock")}</span>
          )}
        </div>
      </div>
    </article>
  );
}
