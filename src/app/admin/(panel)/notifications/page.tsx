import { getLocale, getTranslations } from "next-intl/server";
import { type ContactLink, NotificationActions } from "@/components/admin/notification-actions";
import { defaultLocale, type Locale } from "@/config/i18n";
import { requireAdmin } from "@/lib/auth";
import { whatsappUrl, telUrl } from "@/lib/contact";
import { formatDate, formatPrice, pickLocalized } from "@/lib/format";
import { effectivePrice, readiness, type Readiness } from "@/lib/notify";
import { absoluteUrl } from "@/lib/storefront";
import { getCurrentStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";

const GROUPS: Readiness[] = ["ready", "waiting", "notified"];

export default async function AdminNotificationsPage() {
  const [session, locale, t, store] = await Promise.all([
    requireAdmin(),
    getLocale(),
    getTranslations("admin.notifications"),
    getCurrentStore(),
  ]);
  const db = await createClient();

  const { data, error } = await db
    .from("notification_subscriptions")
    .select(
      "id, type, channel, destination, status, locale, price_at_subscribe, created_at, notified_at, products(slug, name_ar, name_en, price, availability, offers(new_price, start_at, end_at, active))",
    )
    .eq("store_id", session.storeId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return (
      <p role="alert" className="text-danger">
        {t("loadError")}
      </p>
    );
  }

  const now = new Date();
  const canEdit = session.role !== "viewer";

  const rows = await Promise.all(
    data.map(async (request) => {
      const product = request.products;
      if (!product) return null;

      const liveOffers = product.offers
        .filter((offer) => offer.active && (!offer.start_at || new Date(offer.start_at) <= now) && (!offer.end_at || new Date(offer.end_at) > now))
        .map((offer) => Number(offer.new_price));
      const offerPrice = liveOffers.length > 0 ? Math.min(...liveOffers) : null;
      const price = Number(product.price);
      const was = request.price_at_subscribe === null ? null : Number(request.price_at_subscribe);
      const state = readiness({ type: request.type, status: request.status, price_at_subscribe: was }, { availability: product.availability, price, offerPrice });
      const nowPrice = effectivePrice(price, offerPrice);

      // The message is written in the language the visitor was using.
      const language = (request.locale === "en" ? "en" : defaultLocale) as Locale;
      const messages = await getTranslations({ locale: language, namespace: "store.notify.messages" });
      const name = pickLocalized(language, product.name_ar, product.name_en);
      const url = absoluteUrl(language, `/products/${product.slug}`);
      const message =
        request.type === "restock"
          ? messages("restock", { name, url })
          : messages("priceDrop", { name, price: formatPrice(nowPrice, store.currency_code, language), url });
      const subject = messages("subject", { name });

      const links: ContactLink[] = [];
      if (request.channel === "email") {
        links.push({ kind: "email", href: `mailto:${request.destination}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}` });
      } else {
        // A number that starts with 0 has no country code, which WhatsApp needs; calling still works.
        if (!request.destination.startsWith("0")) links.push({ kind: "whatsapp", href: whatsappUrl(request.destination, message) });
        links.push({ kind: "call", href: telUrl(request.destination) });
      }

      return {
        id: request.id,
        state,
        type: request.type,
        destination: request.destination,
        createdAt: request.created_at,
        name: pickLocalized(locale, product.name_ar, product.name_en),
        slug: product.slug,
        was,
        nowPrice,
        links,
      };
    }),
  );
  const items = rows.filter((row): row is NonNullable<typeof row> => row !== null);

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("intro")}</p>
        <p className="mt-1 text-sm text-muted">{t("privacy")}</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center">
          <p className="font-bold">{t("empty.title")}</p>
          <p className="mt-1 text-sm text-muted">{t("empty.body")}</p>
        </div>
      ) : (
        GROUPS.map((group) => {
          const groupItems = items.filter((item) => item.state === group);
          if (groupItems.length === 0) return null;
          return (
            <section key={group} aria-labelledby={`group-${group}`} className="flex flex-col gap-3" data-group={group}>
              <h2 id={`group-${group}`} className="text-lg font-bold">
                {t(`groups.${group}`)} ({groupItems.length})
              </h2>
              <p className="text-sm text-muted">{t(`groupHints.${group}`)}</p>
              <ul className="flex flex-col gap-2">
                {groupItems.map((item) => (
                  <li key={item.id} className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between" data-notification>
                    <div className="min-w-0">
                      <p className="font-medium">
                        <a href={`/admin/products?q=${encodeURIComponent(item.slug)}`} className="underline-offset-2 hover:underline">
                          {item.name}
                        </a>
                        <span className="ms-2 rounded-full bg-surface px-2 py-0.5 text-xs font-medium">{t(`types.${item.type as "restock"}`)}</span>
                      </p>
                      <p className="text-sm" dir="ltr">
                        {item.destination}
                      </p>
                      <p className="text-xs text-muted">
                        {formatDate(item.createdAt, locale)}
                        {item.type === "price_drop" && item.was !== null && (
                          <>
                            {" · "}
                            {t("priceThen", { price: formatPrice(item.was, store.currency_code, locale) })}
                            {" → "}
                            {t("priceNow", { price: formatPrice(item.nowPrice, store.currency_code, locale) })}
                          </>
                        )}
                      </p>
                    </div>
                    {canEdit && <NotificationActions id={item.id} notified={item.state === "notified"} links={item.links} productName={item.name} />}
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
