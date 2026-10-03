import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/ui/button";
import { type AnalyticsSummary, fillDays, PERIODS } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { getCurrentStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";

/** Today's date in the store's own time zone, as a Date at noon UTC (only the calendar day matters). */
function storeToday(timeZone: string): Date {
  const key = new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
  return new Date(`${key}T12:00:00Z`);
}

export async function AnalyticsPanel({ storeId, days }: { storeId: string; days: number }) {
  const [t, locale, store] = await Promise.all([getTranslations("admin.analytics"), getLocale(), getCurrentStore()]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("analytics_summary", {
    p_store: storeId,
    p_days: days,
    p_tz: store.timezone,
  });

  const heading = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-bold">{t("title")}</h2>
      <nav aria-label={t("period")} className="flex gap-2">
        {PERIODS.map((period) => (
          <Link
            key={period}
            href={period === 30 ? "/admin" : `/admin?days=${period}`}
            aria-current={period === days ? "true" : undefined}
            className={cn(buttonClass(period === days ? "primary" : "secondary", "sm"))}
          >
            {t("days", { count: period })}
          </Link>
        ))}
      </nav>
    </div>
  );

  if (error || !data) {
    return (
      <section aria-label={t("title")} className="flex flex-col gap-4">
        {heading}
        <p role="alert" className="text-danger">
          {t("loadError")}
        </p>
      </section>
    );
  }

  const summary = data as unknown as AnalyticsSummary;
  const number = new Intl.NumberFormat(locale);
  const count = (key: string) => summary.totals[key] ?? 0;
  const hasData = Object.keys(summary.totals).length > 0;

  const cards = [
    { key: "visitors", label: t("cards.visitors"), value: summary.visitors },
    { key: "productViews", label: t("cards.productViews"), value: count("product_view") },
    { key: "whatsapp", label: t("cards.whatsapp"), value: count("whatsapp_click") },
    { key: "phone", label: t("cards.phone"), value: count("phone_click") },
    { key: "shares", label: t("cards.shares"), value: count("share") },
    { key: "qrScans", label: t("cards.qrScans"), value: count("qr_scan") },
    { key: "favorites", label: t("cards.favorites"), value: count("favorite_add") },
    { key: "compares", label: t("cards.compares"), value: count("compare_add") },
  ];

  const daily = fillDays(summary.daily, days, storeToday(store.timezone));
  const peak = Math.max(1, ...daily.map((entry) => entry.views));
  const productName = (product: { name_ar: string; name_en: string | null }) =>
    (locale === "ar" ? product.name_ar : product.name_en) || product.name_ar;

  return (
    <section aria-label={t("title")} className="flex flex-col gap-5" data-analytics>
      {heading}
      <p className="text-sm text-muted">{t("privacy")}</p>

      {!hasData ? (
        <p className="rounded-2xl border border-border bg-background p-5 text-muted">{t("empty")}</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {cards.map((card) => (
              <div key={card.key} className="rounded-2xl border border-border bg-background p-4" data-stat={card.key}>
                <dt className="text-sm text-muted">{card.label}</dt>
                <dd className="mt-1 text-2xl font-bold">{number.format(card.value)}</dd>
              </div>
            ))}
          </dl>

          <div className="rounded-2xl border border-border bg-background p-4">
            <h3 className="mb-3 font-bold">{t("daily")}</h3>
            <ol className="flex h-32 items-end gap-px" aria-label={t("daily")} dir="ltr">
              {daily.map((entry) => (
                <li
                  key={entry.day}
                  title={`${entry.day}: ${number.format(entry.views)}`}
                  className="flex h-full flex-1 items-end"
                >
                  <span
                    className="block w-full rounded-t bg-primary"
                    style={{ height: `${entry.views === 0 ? 2 : Math.max(4, (entry.views / peak) * 100)}%`, opacity: entry.views === 0 ? 0.25 : 1 }}
                  />
                  <span className="sr-only">
                    {entry.day}: {entry.views}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="overflow-x-auto rounded-2xl border border-border bg-background p-4 lg:col-span-2">
              <h3 className="mb-3 font-bold">{t("topProducts")}</h3>
              <table className="w-full text-sm" data-top-products>
                <thead>
                  <tr className="text-start text-muted">
                    <th className="py-1 text-start font-medium">{t("columns.product")}</th>
                    <th className="px-2 text-end font-medium">{t("columns.views")}</th>
                    <th className="px-2 text-end font-medium">{t("columns.whatsapp")}</th>
                    <th className="px-2 text-end font-medium">{t("columns.phone")}</th>
                    <th className="px-2 text-end font-medium">{t("columns.shares")}</th>
                    <th className="px-2 text-end font-medium">{t("columns.qr")}</th>
                    <th className="ps-2 text-end font-medium">{t("columns.favorites")}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.top_products.map((product) => (
                    <tr key={product.id} className="border-t border-border">
                      <td className="py-2">
                        <Link href={`/admin/products/${product.id}`} className="underline-offset-2 hover:underline">
                          {productName(product)}
                        </Link>
                      </td>
                      <td className="px-2 text-end">{number.format(product.views)}</td>
                      <td className="px-2 text-end">{number.format(product.whatsapp)}</td>
                      <td className="px-2 text-end">{number.format(product.phone)}</td>
                      <td className="px-2 text-end">{number.format(product.shares)}</td>
                      <td className="px-2 text-end">{number.format(product.qr_scans)}</td>
                      <td className="ps-2 text-end">{number.format(product.favorites)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-border bg-background p-4">
                <h3 className="mb-3 font-bold">{t("topCategories")}</h3>
                <ol className="flex flex-col gap-1 text-sm" data-top-categories>
                  {summary.top_categories.map((category) => (
                    <li key={category.id} className="flex justify-between gap-3 border-t border-border py-1.5 first:border-0">
                      <span>{(locale === "ar" ? category.name_ar : category.name_en) || category.name_ar}</span>
                      <span className="text-muted">{number.format(category.views)}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <h3 className="mb-3 font-bold">{t("topSearches")}</h3>
                {summary.top_searches.length === 0 ? (
                  <p className="text-sm text-muted">{t("noSearches")}</p>
                ) : (
                  <ol className="flex flex-col gap-1 text-sm" data-top-searches>
                    {summary.top_searches.map((entry) => (
                      <li key={entry.query} className="flex justify-between gap-3 border-t border-border py-1.5 first:border-0">
                        <span className="break-all">{entry.query}</span>
                        <span className="text-muted">{number.format(entry.count)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
