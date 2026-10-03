import { getTranslations } from "next-intl/server";
import { OfferCountdown } from "@/components/storefront/offer-countdown";
import { OpenNowBadge } from "@/components/storefront/open-now";
import { Price } from "@/components/storefront/price";
import { ProductGrid } from "@/components/storefront/product-grid";
import { CallButton, WhatsAppButton } from "@/components/storefront/contact-buttons";
import { buttonClass } from "@/components/ui/button";
import type { Locale } from "@/config/i18n";
import { Link } from "@/i18n/navigation";
import {
  getHomepageSections,
  getOfferBanners,
  searchCatalog,
  type CatalogItem,
  type Category,
  type Collection,
  type HomepageSection,
  type StoreSettings,
} from "@/lib/catalog";
import { pickLocalized } from "@/lib/format";
import { readBanner, readLimit } from "@/lib/homepage";
import { thumbUrl } from "@/lib/images";
import { sanitizeBannerLink } from "@/lib/site-images";
import { currentPrice, localizedName } from "@/lib/storefront";
import { parseWorkingHours } from "@/lib/working-hours";

type Store = { id: string; name: string; currency_code: string; timezone: string };

const COLLECTION_BY_SECTION: Partial<Record<HomepageSection["type"], Collection>> = {
  offers: "offers",
  new_arrivals: "new",
  best_sellers: "bestsellers",
  featured: "featured",
  deal_of_day: "offers",
};

const VIEW_ALL_HREF: Partial<Record<HomepageSection["type"], string>> = {
  offers: "/products?sale=1",
  new_arrivals: "/products",
  best_sellers: "/products",
  featured: "/products",
};

type Props = {
  locale: Locale;
  store: Store;
  settings: StoreSettings | null;
  categories: Category[];
};

/** The homepage: sections in the order the owner chose, each one skipped when it has nothing to show. */
export async function HomeSections({ locale, store, settings, categories }: Props) {
  const t = await getTranslations("store.home");
  const sections = await getHomepageSections(store.id);

  // What each section shows: its collection, limited to the number the owner chose.
  const sizeOf = (section: HomepageSection) => (section.type === "deal_of_day" ? 1 : readLimit(section.config));
  const keyOf = (collection: Collection, size: number) => `${collection}:${size}`;

  // Load every distinct (collection, size) once, in parallel.
  const wanted = new Map<string, { collection: Collection; size: number }>();
  for (const section of sections) {
    const collection = COLLECTION_BY_SECTION[section.type];
    if (collection) wanted.set(keyOf(collection, sizeOf(section)), { collection, size: sizeOf(section) });
  }
  const loaded = await Promise.all(
    [...wanted.entries()].map(async ([key, { collection, size }]) => {
      const page = await searchCatalog({ storeId: store.id, locale, collection, pageSize: size });
      return [key, page.items] as const;
    }),
  );
  const itemsByKey = new Map<string, CatalogItem[]>(loaded);

  // Offers with a banner picture: only the ones that are live right now.
  const now = new Date();
  const offerBanners = sections.some((section) => section.type === "offers")
    ? (await getOfferBanners(store.id).catch(() => [])).filter(
        (offer) =>
          (!offer.start_at || new Date(offer.start_at) <= now) &&
          (!offer.end_at || new Date(offer.end_at) > now),
      )
    : [];

  return (
    <div className="flex flex-col gap-10">
      {sections.map((section) => {
        const title = pickLocalized(locale, section.title_ar, section.title_en) || t(`sections.${section.type}`);
        const subtitle = pickLocalized(locale, section.subtitle_ar, section.subtitle_en);
        const collection = COLLECTION_BY_SECTION[section.type];
        const items = (collection && itemsByKey.get(keyOf(collection, sizeOf(section)))) || [];

        switch (section.type) {
          case "hero":
            return <Hero key={section.id} title={title} subtitle={subtitle} store={store} settings={settings} locale={locale} />;
          case "categories":
            return categories.length > 0 ? (
              <CategoriesSection key={section.id} title={title} categories={categories} locale={locale} />
            ) : null;
          case "offers":
          case "new_arrivals":
          case "best_sellers":
          case "featured":
            return items.length > 0 ? (
              <Section key={section.id} title={title} subtitle={subtitle} viewAll={VIEW_ALL_HREF[section.type]}>
                {section.type === "offers" && offerBanners.length > 0 && (
                  <ul className="grid gap-3 md:grid-cols-2" data-offer-banners>
                    {offerBanners.slice(0, 2).map((offer) => (
                      <li key={offer.id}>
                        <Link href={`/products/${offer.products.slug}`} className="block overflow-hidden rounded-2xl border border-border focus-visible:outline-2 focus-visible:outline-primary">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={offer.banner_image_url!}
                            alt={pickLocalized(locale, offer.title_ar, offer.title_en)}
                            width={1600}
                            height={500}
                            loading="lazy"
                            className="aspect-[16/5] w-full object-cover"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <ProductGrid items={items} locale={locale} currency={store.currency_code} />
              </Section>
            ) : null;
          case "deal_of_day":
            return items[0] ? (
              <DealOfTheDay key={section.id} title={title} item={items[0]} locale={locale} currency={store.currency_code} />
            ) : null;
          case "banner": {
            const banner = readBanner(section.config);
            return banner.imageUrl ? (
              <Banner key={section.id} imageUrl={banner.imageUrl} link={sanitizeBannerLink(banner.linkUrl)} title={title} subtitle={subtitle} />
            ) : null;
          }
          case "trust":
            return <Trust key={section.id} title={title} />;
          case "contact":
            return <ContactSection key={section.id} title={title} store={store} settings={settings} locale={locale} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

async function Section({
  title,
  subtitle,
  viewAll,
  children,
}: {
  title: string;
  subtitle?: string;
  viewAll?: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations("store.home");
  return (
    <section className="flex flex-col gap-4" aria-label={title}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {viewAll && (
          <Link href={viewAll} className="text-sm font-medium text-primary underline underline-offset-2">
            {t("viewAll")}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

async function Hero({
  title,
  subtitle,
  store,
  settings,
  locale,
}: {
  title: string;
  subtitle: string;
  store: Store;
  settings: StoreSettings | null;
  locale: Locale;
}) {
  const t = await getTranslations("store.home");
  const about = pickLocalized(locale, settings?.about_text_ar, settings?.about_text_en);

  return (
    <section
      className="relative isolate overflow-hidden rounded-3xl bg-secondary px-6 py-12 text-secondary-foreground sm:px-12 sm:py-16"
      aria-label={store.name}
      data-hero={settings?.hero_image_url ? "image" : "plain"}
    >
      {settings?.hero_image_url && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={settings.hero_image_url} alt="" fetchPriority="high" className="absolute inset-0 -z-20 size-full object-cover" />
          {/* keeps the text readable on any picture */}
          <span aria-hidden className="absolute inset-0 -z-10 bg-secondary/75" />
        </>
      )}
      <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-5xl">{title}</h1>
      {(subtitle || about) && <p className="mt-4 max-w-2xl text-base opacity-90 sm:text-lg">{subtitle || about}</p>}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/products" className={buttonClass("primary")}>
          {t("browse")}
        </Link>
        {settings?.whatsapp && <WhatsAppButton number={settings.whatsapp} variant="secondary" />}
      </div>
    </section>
  );
}

function CategoriesSection({
  title,
  categories,
  locale,
}: {
  title: string;
  categories: Category[];
  locale: Locale;
}) {
  return (
    <section className="flex flex-col gap-4" aria-label={title}>
      <h2 className="text-2xl font-bold">{title}</h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {categories.map((category) => {
          const name = pickLocalized(locale, category.name_ar, category.name_en);
          return (
            <li key={category.id}>
              <Link
                href={`/categories/${category.slug}`}
                className="flex h-full flex-col items-center gap-3 rounded-2xl border border-border bg-background p-5 text-center transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary"
              >
                {category.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={category.image_url} alt="" width={112} height={112} loading="lazy" className="size-14 rounded-full object-cover" />
                ) : (
                  <span
                    aria-hidden
                    className="flex size-14 items-center justify-center rounded-full bg-surface text-xl font-bold text-primary"
                  >
                    {name.slice(0, 1)}
                  </span>
                )}
                <span className="font-medium">{name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Banner({
  imageUrl,
  link,
  title,
  subtitle,
}: {
  imageUrl: string;
  link: string | null;
  title: string;
  subtitle: string;
}) {
  const external = link !== null && !link.startsWith("/");
  const picture = (
    <div className="relative isolate overflow-hidden rounded-3xl" data-banner>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="" width={1600} height={500} loading="lazy" className="aspect-[16/6] w-full object-cover" />
      {(title || subtitle) && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 text-white">
          {title && <p className="text-xl font-bold sm:text-2xl">{title}</p>}
          {subtitle && <p className="text-sm opacity-90">{subtitle}</p>}
        </div>
      )}
    </div>
  );
  if (!link) return <section aria-label={title || undefined}>{picture}</section>;
  return (
    <section aria-label={title || undefined}>
      {external ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="block focus-visible:outline-2 focus-visible:outline-primary">
          {picture}
        </a>
      ) : (
        <Link href={link} className="block focus-visible:outline-2 focus-visible:outline-primary">
          {picture}
        </Link>
      )}
    </section>
  );
}

async function DealOfTheDay({
  title,
  item,
  locale,
  currency,
}: {
  title: string;
  item: CatalogItem;
  locale: Locale;
  currency: string;
}) {
  const t = await getTranslations("store.home");
  const name = localizedName(locale, item);
  const { current, was, discountPercent } = currentPrice({
    price: Number(item.price),
    offerPrice: item.offer_price === null ? null : Number(item.offer_price),
    offerOldPrice: item.offer_old_price === null ? null : Number(item.offer_old_price),
  });

  return (
    <section
      className="grid items-center gap-6 rounded-3xl border border-border bg-background p-6 md:grid-cols-[minmax(0,16rem)_1fr]"
      aria-label={title}
    >
      <div className="aspect-square overflow-hidden rounded-2xl bg-surface">
        {item.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl(item.image_url)} alt="" width={480} height={480} loading="lazy" className="size-full object-contain p-4" />
        )}
      </div>
      <div className="flex flex-col items-start gap-3">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-xl font-medium">{name}</p>
        <Price current={current} was={was} currency={currency} locale={locale} size="lg" />
        {discountPercent && (
          <span className="rounded-full bg-danger px-3 py-1 text-sm font-bold text-white">
            {t("save", { percent: discountPercent })}
          </span>
        )}
        {item.offer_ends_at && <OfferCountdown endsAt={item.offer_ends_at} />}
        <Link href={`/products/${item.slug}`} className={buttonClass("primary")}>
          {t("viewDeal")}
        </Link>
      </div>
    </section>
  );
}

async function Trust({ title }: { title: string }) {
  const t = await getTranslations("store.home.trust");
  const points = ["catalog", "whatsapp", "prices", "visit"] as const;

  return (
    <section className="flex flex-col gap-4" aria-label={title}>
      <h2 className="text-2xl font-bold">{title}</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {points.map((point) => (
          <li key={point} className="rounded-2xl border border-border bg-background p-5">
            <p className="font-bold">{t(`${point}.title`)}</p>
            <p className="mt-1 text-sm text-muted">{t(`${point}.body`)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function ContactSection({
  title,
  store,
  settings,
  locale,
}: {
  title: string;
  store: Store;
  settings: StoreSettings | null;
  locale: Locale;
}) {
  const t = await getTranslations("store.home");
  const address = pickLocalized(locale, settings?.address_ar, settings?.address_en);
  const hours = parseWorkingHours(settings?.working_hours);
  const hasContact = Boolean(settings?.whatsapp || settings?.phone || address);
  if (!hasContact) return null;

  return (
    <section className="flex flex-col items-start gap-4 rounded-3xl border border-border bg-background p-6" aria-label={title}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold">{title}</h2>
        <OpenNowBadge hours={hours} timeZone={store.timezone} />
      </div>
      {address && <p className="text-muted">{address}</p>}
      <div className="flex flex-wrap gap-3">
        {settings?.whatsapp && <WhatsAppButton number={settings.whatsapp} label={t("chatOnWhatsapp")} />}
        {settings?.phone && <CallButton phone={settings.phone} />}
      </div>
    </section>
  );
}
