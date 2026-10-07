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
    <div className="flex flex-col gap-12">
      {sections.map((section) => {
        const title = pickLocalized(locale, section.title_ar, section.title_en) || t(`sections.${section.type}`);
        const subtitle = pickLocalized(locale, section.subtitle_ar, section.subtitle_en);
        const collection = COLLECTION_BY_SECTION[section.type];
        const items = (collection && itemsByKey.get(keyOf(collection, sizeOf(section)))) || [];

        switch (section.type) {
          case "hero":
            return <Hero key={section.id} title={title} subtitle={subtitle} store={store} settings={settings} locale={locale} categories={categories} />;
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
                        <Link href={`/products/${offer.products.slug}`} className="lift block overflow-hidden rounded-2xl border border-border shadow-card focus-visible:outline-2 focus-visible:outline-primary">
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
    <section className="flex flex-col gap-5" aria-label={title}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="max-w-2xl text-sm text-muted">{subtitle}</p>}
        </div>
        {viewAll && (
          <Link
            href={viewAll}
            className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-background px-4 py-1.5 text-sm font-medium transition-colors hover:border-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-primary"
          >
            {t("viewAll")}
            <span aria-hidden className="inline-block rtl:-scale-x-100">→</span>
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
  categories,
}: {
  title: string;
  subtitle: string;
  store: Store;
  settings: StoreSettings | null;
  locale: Locale;
  categories: Category[];
}) {
  const t = await getTranslations("store.home");
  const about = pickLocalized(locale, settings?.about_text_ar, settings?.about_text_en);
  const image = settings?.hero_image_url;

  return (
    <section
      className={`relative isolate overflow-hidden rounded-3xl bg-secondary text-secondary-foreground shadow-lift ${image ? "min-h-[26rem]" : ""}`}
      aria-label={store.name}
      data-hero={image ? "image" : "plain"}
    >
      {image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" fetchPriority="high" className="absolute inset-0 -z-20 size-full object-cover" />
          {/* keeps the text readable on any picture */}
          <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-secondary/95 via-secondary/70 to-secondary/35" />
          <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-secondary/70 to-transparent rtl:bg-gradient-to-l" />
        </>
      ) : (
        <>
          <span aria-hidden className="dots absolute inset-0 -z-10 opacity-70" />
          <span aria-hidden className="absolute -end-24 -top-28 -z-10 size-[26rem] rounded-full bg-primary opacity-40 blur-3xl" />
          <span aria-hidden className="absolute -bottom-36 -start-20 -z-10 size-[22rem] rounded-full bg-accent opacity-25 blur-3xl" />
        </>
      )}

      <div className="flex max-w-3xl flex-col items-start gap-5 px-6 py-14 sm:px-14 sm:py-20 lg:py-24">
        <h1 className="text-4xl font-extrabold leading-[1.12] sm:text-6xl">{title}</h1>
        {(subtitle || about) && <p className="max-w-xl text-base opacity-90 sm:text-lg">{subtitle || about}</p>}
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href="/products" className={`${buttonClass("primary")} rounded-pill px-7 py-3 text-base font-semibold shadow-glow ring-1 ring-white/20`}>
            {t("browse")}
          </Link>
          {settings?.whatsapp && (
            <WhatsAppButton number={settings.whatsapp} variant="secondary" className="rounded-pill px-6 py-3 text-base font-semibold" />
          )}
        </div>
        {categories.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-3" aria-label={t("sections.categories")}>
            {categories.slice(0, 6).map((category) => (
              <li key={category.id}>
                <Link
                  href={`/categories/${category.slug}`}
                  className="inline-flex rounded-pill border border-current/25 bg-white/10 px-4 py-1.5 text-sm backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-current"
                >
                  {pickLocalized(locale, category.name_ar, category.name_en)}
                </Link>
              </li>
            ))}
          </ul>
        )}
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
    <section className="flex flex-col gap-5" aria-label={title}>
      <h2 className="section-title">{title}</h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {categories.map((category) => {
          const name = pickLocalized(locale, category.name_ar, category.name_en);
          return (
            <li key={category.id}>
              <Link
                href={`/categories/${category.slug}`}
                className="lift group flex h-full flex-col items-center gap-3 rounded-2xl border border-border/80 bg-gradient-to-b from-background to-primary-soft p-6 text-center shadow-card focus-visible:outline-2 focus-visible:outline-primary"
              >
                {category.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={category.image_url} alt="" width={128} height={128} loading="lazy" className="size-16 rounded-full object-cover ring-4 ring-primary-soft transition-transform duration-300 group-hover:scale-110" />
                ) : (
                  <span
                    aria-hidden
                    className="flex size-16 items-center justify-center rounded-full bg-primary-tint text-2xl font-extrabold text-primary ring-4 ring-primary-soft transition-transform duration-300 group-hover:scale-110"
                  >
                    {name.slice(0, 1)}
                  </span>
                )}
                <span className="font-semibold leading-snug">{name}</span>
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
    <div className="lift relative isolate overflow-hidden rounded-3xl shadow-card" data-banner>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="" width={1600} height={500} loading="lazy" className="aspect-[16/6] w-full object-cover" />
      {(title || subtitle) && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-5 pt-12 text-white sm:p-7">
          {title && <p className="text-xl font-extrabold sm:text-3xl">{title}</p>}
          {subtitle && <p className="text-sm opacity-90 sm:text-base">{subtitle}</p>}
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
      className="relative isolate grid items-center gap-8 overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-primary-soft via-background to-background p-6 shadow-card sm:p-10 md:grid-cols-[minmax(0,19rem)_1fr]"
      aria-label={title}
    >
      <span aria-hidden className="absolute -end-20 -top-20 -z-10 size-72 rounded-full bg-primary opacity-15 blur-3xl" />
      <div className="aspect-square overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_35%,var(--background),var(--surface))] shadow-card">
        {item.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl(item.image_url)} alt="" width={480} height={480} loading="lazy" className="size-full object-contain p-6" />
        )}
      </div>
      <div className="flex flex-col items-start gap-3.5">
        <h2 className="section-title">{title}</h2>
        <p className="text-2xl font-bold sm:text-3xl">{name}</p>
        <Price current={current} was={was} currency={currency} locale={locale} size="lg" />
        {discountPercent && (
          <span className="rounded-pill bg-danger px-3.5 py-1 text-sm font-bold text-white shadow-sm">
            {t("save", { percent: discountPercent })}
          </span>
        )}
        {item.offer_ends_at && <OfferCountdown endsAt={item.offer_ends_at} />}
        <Link href={`/products/${item.slug}`} className={`${buttonClass("primary")} mt-1 rounded-pill px-7 py-3 text-base font-semibold shadow-glow`}>
          {t("viewDeal")}
        </Link>
      </div>
    </section>
  );
}

const TRUST_ICONS: Record<string, React.ReactNode> = {
  catalog: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  whatsapp: <path d="M21 12a8.5 8.5 0 0 1-12.3 7.6L3 21l1.5-5.4A8.5 8.5 0 1 1 21 12z" />,
  prices: (
    <>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
      <circle cx="7.5" cy="7.5" r="1.2" />
    </>
  ),
  visit: (
    <>
      <path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
};

async function Trust({ title }: { title: string }) {
  const t = await getTranslations("store.home.trust");
  const points = ["catalog", "whatsapp", "prices", "visit"] as const;

  return (
    <section className="flex flex-col gap-5" aria-label={title}>
      <h2 className="section-title">{title}</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {points.map((point) => (
          <li key={point} className="lift rounded-2xl border border-border/80 bg-background p-6 shadow-card">
            <span aria-hidden className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary ring-1 ring-primary/10">
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {TRUST_ICONS[point]}
              </svg>
            </span>
            <p className="font-bold">{t(`${point}.title`)}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{t(`${point}.body`)}</p>
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
    <section
      className="relative isolate flex flex-col items-start gap-5 overflow-hidden rounded-3xl bg-secondary p-7 text-secondary-foreground shadow-lift sm:p-10"
      aria-label={title}
    >
      <span aria-hidden className="dots absolute inset-0 -z-10 opacity-60" />
      <span aria-hidden className="absolute -end-16 -top-24 -z-10 size-72 rounded-full bg-primary opacity-35 blur-3xl" />
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-extrabold sm:text-3xl">{title}</h2>
        <OpenNowBadge hours={hours} timeZone={store.timezone} />
      </div>
      {address && <p className="max-w-xl opacity-90">{address}</p>}
      <div className="flex flex-wrap gap-3">
        {settings?.whatsapp && (
          <WhatsAppButton number={settings.whatsapp} label={t("chatOnWhatsapp")} className="rounded-pill px-6 py-3 font-semibold ring-1 ring-white/25" />
        )}
        {settings?.phone && <CallButton phone={settings.phone} className="rounded-pill px-6 py-3 font-semibold" />}
      </div>
    </section>
  );
}
