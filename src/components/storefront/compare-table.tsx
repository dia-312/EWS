import { useTranslations } from "next-intl";
import { AvailabilityBadge } from "@/components/storefront/badges";
import { CompareRemoveButton } from "@/components/storefront/compare-bits";
import { Price } from "@/components/storefront/price";
import { buttonClass } from "@/components/ui/button";
import { isKnownSpecKey, KNOWN_SPEC_KEYS } from "@/config/specs";
import type { Locale } from "@/config/i18n";
import { Link } from "@/i18n/navigation";
import type { CompareProduct } from "@/lib/catalog";
import { pickLocalized } from "@/lib/format";
import { thumbUrl } from "@/lib/images";
import { currentPrice, localizedName } from "@/lib/storefront";

/**
 * Every specification key used by at least one product: the known keys in their
 * usual order first, then custom ones alphabetically. Products that lack a key
 * simply show a dash in that row.
 */
export function collectSpecKeys(products: Pick<CompareProduct, "product_specs">[]): string[] {
  const used = new Set(products.flatMap((product) => product.product_specs.map((spec) => spec.spec_key)));
  const known = KNOWN_SPEC_KEYS.filter((key) => used.has(key));
  const custom = [...used].filter((key) => !isKnownSpecKey(key)).sort((a, b) => a.localeCompare(b));
  return [...known, ...custom];
}

type CompareTableProps = {
  products: CompareProduct[];
  locale: Locale;
  currency: string;
};

/** Side-by-side comparison. It scrolls sideways on small screens; the first column stays in view. */
export function CompareTable({ products, locale, currency }: CompareTableProps) {
  const t = useTranslations("store.compare");
  const tSpecs = useTranslations("specs");
  const specKeys = collectSpecKeys(products);

  const cell = "border-b border-border px-4 py-3 align-top";
  const rowHead = "sticky start-0 z-10 w-32 min-w-32 border-b border-border bg-surface px-4 py-3 text-start align-top text-sm font-medium sm:w-44 sm:min-w-44";

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-background" tabIndex={0} role="region" aria-label={t("scrollRegion")}>
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <caption className="sr-only">{t("caption")}</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky start-0 z-10 w-32 min-w-32 border-b border-border bg-surface px-4 py-3 text-start text-xs font-medium text-muted sm:w-44 sm:min-w-44">
              {t("product")}
            </th>
            {products.map((product) => {
              const name = localizedName(locale, product);
              const image = [...product.product_images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary))[0];
              return (
                <th key={product.id} scope="col" className="min-w-44 border-b border-border px-4 py-3 text-start align-top font-normal">
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex size-24 items-center justify-center overflow-hidden rounded-lg bg-surface">
                      {image?.public_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbUrl(image.public_url)} alt="" width={96} height={96} loading="lazy" className="size-full object-contain p-1" />
                      ) : (
                        <span aria-hidden className="text-2xl text-muted">▢</span>
                      )}
                    </div>
                    <Link href={`/products/${product.slug}`} className="font-bold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary">
                      {name}
                    </Link>
                    {product.brands && <span className="text-xs text-muted">{product.brands.name}</span>}
                    <CompareRemoveButton
                      productId={product.id}
                      productName={name}
                      remainingIds={products.filter((other) => other.id !== product.id).map((other) => other.id)}
                    />
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className={rowHead}>{t("price")}</th>
            {products.map((product) => {
              const { current, was } = currentPrice({
                price: Number(product.price),
                offerPrice: product.offer ? Number(product.offer.new_price) : null,
                offerOldPrice: product.offer?.old_price != null ? Number(product.offer.old_price) : null,
              });
              return (
                <td key={product.id} className={cell}>
                  <Price current={current} was={was} currency={currency} locale={locale} />
                </td>
              );
            })}
          </tr>
          <tr>
            <th scope="row" className={rowHead}>{t("availability")}</th>
            {products.map((product) => (
              <td key={product.id} className={cell}>
                <AvailabilityBadge availability={product.availability} />
              </td>
            ))}
          </tr>
          {specKeys.map((key) => (
            <tr key={key} data-spec={key}>
              <th scope="row" className={rowHead}>{isKnownSpecKey(key) ? tSpecs(key) : key}</th>
              {products.map((product) => {
                const spec = product.product_specs.find((item) => item.spec_key === key);
                const value = spec ? pickLocalized(locale, spec.value_ar, spec.value_en) : "";
                return (
                  <td key={product.id} className={cell}>
                    {value ? value : <span aria-label={t("notAvailable")} className="text-muted">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <th scope="row" className={`${rowHead} border-b-0`} />
            {products.map((product) => (
              <td key={product.id} className="px-4 py-3">
                <Link href={`/products/${product.slug}`} className={buttonClass("secondary", "sm")}>
                  {t("viewProduct")}
                </Link>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
