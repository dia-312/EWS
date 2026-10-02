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
  searchCatalog,
  type CatalogItem,
  type Category,
  type Collection,
  type HomepageSection,
  type StoreSettings,
} from "@/lib/catalog";
import { pickLocalized } from "@/lib/format";
import { thumbUrl } from "@/lib/images";
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

  // Load every product collection once, in parallel.
  const collections = [...new Set(sections.map((s) => COLLECTION_BY_SECTION[s.type]).filter(Boolean))] as Collection[];
  const loaded = await Promise.all(
    collections.map(async (collection) => {
      const page = await searchCatalog({ storeId: store.id, locale, collection, pageSize: 8 });
      return [collection, page.items] as const;
    }),
  );
  const itemsByCollection = new Map<Collection, CatalogItem[]>(loaded);

  return (
    <div className="flex flex-col gap-10">
      {sections.map((section) => {
        const title = pickLocalized(locale, section.title_ar, section.title_en) || t(`sections.${section.type}`);
        const subtitle = pickLocalized(locale, section.subtitle_ar, section.subtitle_en);
        const items = itemsByCollection.get(COLLECTION_BY_SECTION[section.type] as Collection) ?? [];

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
                <ProductGrid items={items} locale={locale} currency={store.currency_code} />
              </Section>
            ) : null;
          case "deal_of_day":
            return items[0] ? (
              <DealOfTheDay key={section.id} title={title} item={items[0]} locale={locale} currency={store.currency_code} />
            ) : null;
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
    <section className="rounded-3xl bg-secondary px-6 py-12 text-secondary-foreground sm:px-12 sm:py-16" aria-label={store.name}>
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
                <span
                  aria-hidden
                  className="flex size-14 items-center justify-center rounded-full bg-surface text-xl font-bold text-primary"
                >
                  {name.slice(0, 1)}
                </span>
                <span className="font-medium">{name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
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
