import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { OfferRowActions } from "@/components/admin/offer-row-actions";
import { buttonClass } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatDateTime, formatPrice, pickLocalized } from "@/lib/format";
import { discountPercent, offerStatus, OFFER_STATUSES, type OfferStatus } from "@/lib/offers";
import { getCurrentStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";

const STATUS_STYLE: Record<OfferStatus, string> = {
  live: "bg-green-100 text-green-800",
  scheduled: "bg-blue-100 text-blue-800",
  expired: "bg-surface text-muted",
  inactive: "bg-amber-100 text-amber-900",
};

export default async function AdminOffersPage({ searchParams }: PageProps<"/admin/offers">) {
  const [session, locale, t, store, params] = await Promise.all([
    requireAdmin(),
    getLocale(),
    getTranslations("admin.offers"),
    getCurrentStore(),
    searchParams,
  ]);
  const db = await createClient();

  const { data, error } = await db
    .from("offers")
    .select(
      "id, title_ar, title_en, old_price, new_price, start_at, end_at, active, created_at, products(name_ar, name_en, slug, price)",
    )
    .eq("store_id", session.storeId)
    .order("created_at", { ascending: false })
    .limit(500);

  const statusParam = Array.isArray(params.status) ? params.status[0] : params.status;
  const filter = OFFER_STATUSES.find((value) => value === statusParam);
  const saved = ["created", "updated"].find((value) => value === params.saved);
  const canEdit = session.role !== "viewer";

  const now = new Date();
  const offers = (data ?? []).map((offer) => ({ ...offer, status: offerStatus(offer, now) }));
  const counts = Object.fromEntries(
    OFFER_STATUSES.map((value) => [value, offers.filter((offer) => offer.status === value).length]),
  ) as Record<OfferStatus, number>;
  const visible = filter ? offers.filter((offer) => offer.status === filter) : offers;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {canEdit && (
          <Link href="/admin/offers/new" className={buttonClass("primary")}>
            {t("add")}
          </Link>
        )}
      </div>

      {saved && (
        <p role="status" className="rounded-lg border border-border bg-background px-4 py-3 text-sm">
          {t(`notices.${saved as "created"}`)}
        </p>
      )}

      <nav aria-label={t("filters.label")} className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/admin/offers"
          aria-current={!filter ? "true" : undefined}
          className={cn(
            "rounded-full px-3 py-1",
            !filter ? "bg-primary font-medium text-primary-foreground" : "border border-border hover:bg-surface",
          )}
        >
          {t("filters.all")} ({offers.length})
        </Link>
        {OFFER_STATUSES.map((value) => (
          <Link
            key={value}
            href={`/admin/offers?status=${value}`}
            aria-current={filter === value ? "true" : undefined}
            className={cn(
              "rounded-full px-3 py-1",
              filter === value ? "bg-primary font-medium text-primary-foreground" : "border border-border hover:bg-surface",
            )}
          >
            {t(`status.${value}`)} ({counts[value]})
          </Link>
        ))}
      </nav>

      {error ? (
        <p role="alert" className="text-danger">
          {t("loadError")}
        </p>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center">
          <p className="font-bold">{offers.length === 0 ? t("empty.title") : t("noResults")}</p>
          {offers.length === 0 && <p className="mt-1 text-sm text-muted">{t("empty.body")}</p>}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-background">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                {["product", "label", "price", "window", "status"].map((key) => (
                  <th key={key} scope="col" className="px-4 py-3 text-start font-medium">
                    {t(`columns.${key}`)}
                  </th>
                ))}
                {canEdit && (
                  <th scope="col" className="px-4 py-3 text-start font-medium">
                    {t("columns.actions")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((offer) => {
                const productName = offer.products ? pickLocalized(locale, offer.products.name_ar, offer.products.name_en) : "—";
                const oldPrice = offer.old_price === null ? Number(offer.products?.price ?? 0) : Number(offer.old_price);
                const percent = discountPercent(oldPrice, Number(offer.new_price));
                return (
                  <tr key={offer.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{productName}</div>
                      <div className="text-xs text-muted" dir="ltr">
                        {offer.products?.slug}
                      </div>
                    </td>
                    <td className="px-4 py-3">{pickLocalized(locale, offer.title_ar, offer.title_en) || "—"}</td>
                    <td className="px-4 py-3" dir="ltr">
                      <div className="font-bold">{formatPrice(Number(offer.new_price), store.currency_code, locale)}</div>
                      <div className="text-xs text-muted">
                        <del>{formatPrice(oldPrice, store.currency_code, locale)}</del>
                        {percent !== null && <span className="ms-2">−{percent}%</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div>
                        {offer.start_at ? (
                          <>
                            {t("window.from")} {formatDateTime(offer.start_at, locale, store.timezone)}
                          </>
                        ) : (
                          t("window.noStart")
                        )}
                      </div>
                      <div className="text-muted">
                        {offer.end_at ? (
                          <>
                            {t("window.until")} {formatDateTime(offer.end_at, locale, store.timezone)}
                          </>
                        ) : (
                          t("window.noEnd")
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLE[offer.status])}>
                        {t(`status.${offer.status}`)}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <OfferRowActions id={offer.id} productName={productName} active={offer.active} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
