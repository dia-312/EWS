import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AvailabilityBadge, ProductBadges } from "@/components/storefront/badges";
import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { CallButton, WhatsAppButton } from "@/components/storefront/contact-buttons";
import { OfferCountdown } from "@/components/storefront/offer-countdown";
import { Price } from "@/components/storefront/price";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { ProductGrid } from "@/components/storefront/product-grid";
import { CompareButton, FavoriteButton } from "@/components/storefront/shop-buttons";
import { SpecsTable } from "@/components/storefront/specs-table";
import { locales } from "@/config/i18n";
import { Link } from "@/i18n/navigation";
import { getProductBySlug, searchCatalog } from "@/lib/catalog";
import { formatPrice, pickLocalized } from "@/lib/format";
import { absoluteUrl, currentPrice, isNewProduct, localizedName } from "@/lib/storefront";
import { getStorefront } from "@/lib/storefront-data";

export const dynamic = "force-dynamic";

type Params = PageProps<"/[locale]/products/[slug]">["params"];

async function load(params: Params) {
  const { locale, slug } = await params;
  if (!hasLocale(locales, locale)) return null;
  const { store, settings } = await getStorefront();
  const product = await getProductBySlug(store.id, slug);
  return product ? { locale, slug, store, settings, product } : null;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/products/[slug]">): Promise<Metadata> {
  const data = await load(params);
  if (!data) return {};
  const { locale, slug, product } = data;

  const name = localizedName(locale, product);
  const description =
    pickLocalized(locale, product.short_description_ar, product.short_description_en) ||
    pickLocalized(locale, product.description_ar, product.description_en);
  const primary = [...product.product_images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary))[0];
  const path = `/products/${slug}`;

  return {
    title: name,
    description: description ? description.slice(0, 160) : undefined,
    alternates: {
      canonical: absoluteUrl(locale, path),
      languages: Object.fromEntries(locales.map((value) => [value, absoluteUrl(value, path)])),
    },
    openGraph: {
      type: "website",
      title: name,
      description: description ? description.slice(0, 200) : undefined,
      url: absoluteUrl(locale, path),
      images: primary?.public_url ? [{ url: primary.public_url }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps<"/[locale]/products/[slug]">) {
  const data = await load(params);
  if (!data) notFound();
  const { locale, slug, store, settings, product } = data;
  setRequestLocale(locale);

  const [t, tNav, tBadges] = await Promise.all([
    getTranslations("store.product"),
    getTranslations("store.nav"),
    getTranslations("store.availability"),
  ]);

  const name = localizedName(locale, product);
  const category = product.categories!;
  const categoryName = pickLocalized(locale, category.name_ar, category.name_en);
  const shortDescription = pickLocalized(locale, product.short_description_ar, product.short_description_en);
  const description = pickLocalized(locale, product.description_ar, product.description_en);

  const offer = product.offer;
  const { current, was, discountPercent } = currentPrice({
    price: Number(product.price),
    offerPrice: offer ? Number(offer.new_price) : null,
    offerOldPrice: offer?.old_price != null ? Number(offer.old_price) : null,
  });

  const images = [...product.product_images]
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.display_order - b.display_order)
    .filter((image) => image.public_url)
    .map((image) => ({
      id: image.id,
      url: image.public_url as string,
      alt: pickLocalized(locale, image.alt_text_ar, image.alt_text_en) || name,
    }));

  const isNew = isNewProduct(product.created_at, product.is_new_override);
  const badgeKeys = product.product_badges
    .map((row) => row.badges)
    .filter((badge): badge is NonNullable<typeof badge> => Boolean(badge?.active))
    .sort((a, b) => a.display_order - b.display_order)
    .map((badge) => badge.key);

  const url = absoluteUrl(locale, `/products/${slug}`);
  const whatsappMessage = t("whatsappMessage", {
    name,
    price: formatPrice(current, store.currency_code, locale),
    url,
  });

  const related = (
    await searchCatalog({ storeId: store.id, locale, categoryId: product.category_id, pageSize: 5 })
  ).items
    .filter((item) => item.slug !== slug)
    .slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: shortDescription || description || undefined,
    image: images.map((image) => image.url),
    brand: product.brands ? { "@type": "Brand", name: product.brands.name } : undefined,
    category: categoryName,
    offers: {
      "@type": "Offer",
      url,
      price: current.toFixed(2),
      priceCurrency: store.currency_code,
      availability: {
        in_stock: "https://schema.org/InStock",
        limited: "https://schema.org/LimitedAvailability",
        out_of_stock: "https://schema.org/OutOfStock",
      }[product.availability as "in_stock"],
      priceValidUntil: offer?.end_at ?? undefined,
    },
  };

  return (
    <div className="flex flex-col gap-8">
      <Breadcrumbs
        items={[
          { label: tNav("home"), href: "/" },
          { label: categoryName, href: `/categories/${category.slug}` },
          { label: name },
        ]}
      />

      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery images={images} name={name} />

        <div className="flex flex-col items-start gap-4">
          <ProductBadges
            onSale={Boolean(offer)}
            discountPercent={discountPercent}
            isNew={isNew}
            badgeKeys={badgeKeys}
          />
          <h1 className="text-3xl font-bold leading-tight">{name}</h1>

          <p className="text-sm text-muted">
            {product.brands && <span>{product.brands.name} · </span>}
            <Link href={`/categories/${category.slug}`} className="underline underline-offset-2">
              {categoryName}
            </Link>
          </p>

          <div className="flex flex-col gap-1">
            {offer && pickLocalized(locale, offer.title_ar, offer.title_en) && (
              <p className="text-sm font-bold text-danger">
                {pickLocalized(locale, offer.title_ar, offer.title_en)}
              </p>
            )}
            <Price current={current} was={was} currency={store.currency_code} locale={locale} size="lg" />
          </div>
          {offer?.end_at && <OfferCountdown endsAt={offer.end_at} />}

          <div className="flex flex-col gap-1">
            <AvailabilityBadge availability={product.availability} className="self-start" />
            {product.availability === "out_of_stock" && (
              <p className="text-sm text-muted">{t("outOfStockHint")}</p>
            )}
          </div>

          {shortDescription && <p className="max-w-prose">{shortDescription}</p>}

          <div className="flex flex-wrap gap-3 pt-2">
            {settings?.whatsapp && (
              <WhatsAppButton number={settings.whatsapp} message={whatsappMessage} label={t("askOnWhatsapp")} />
            )}
            {settings?.phone && <CallButton phone={settings.phone} />}
            {!settings?.whatsapp && !settings?.phone && (
              <p className="text-sm text-muted">{t("contactSoon")}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FavoriteButton productId={product.id} productName={name} variant="full" />
            <CompareButton productId={product.id} productName={name} variant="full" />
          </div>
          <span className="sr-only">{tBadges(product.availability as "in_stock")}</span>
        </div>
      </div>

      {description && (
        <section aria-labelledby="description-title" className="flex max-w-3xl flex-col gap-3">
          <h2 id="description-title" className="text-xl font-bold">
            {t("description")}
          </h2>
          <p className="whitespace-pre-line leading-relaxed">{description}</p>
        </section>
      )}

      <SpecsTable specs={product.product_specs} locale={locale} />

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="flex flex-col gap-4">
          <h2 id="related-title" className="text-xl font-bold">
            {t("related")}
          </h2>
          <ProductGrid items={related} locale={locale} currency={store.currency_code} />
        </section>
      )}

      <script
        type="application/ld+json"
        // "<" is escaped so product text can never close the script element.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}
