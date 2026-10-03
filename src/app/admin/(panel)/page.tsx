import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AnalyticsPanel } from "@/components/admin/analytics-panel";
import { buttonClass } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { parseDays } from "@/lib/analytics";
import { formatDate, pickLocalized } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage({
  searchParams,
}: PageProps<"/admin">) {
  const [session, params] = await Promise.all([requireAdmin(), searchParams]);
  const t = await getTranslations("admin.dashboard");
  const supabase = await createClient();
  const now = new Date().toISOString();

  const locale = await getLocale();
  const [activeProducts, outOfStock, onSale, recent, waiting, reviewsWaiting] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", session.storeId)
      .eq("active", true),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", session.storeId)
      .eq("active", true)
      .eq("availability", "out_of_stock"),
    // An offer counts as live inside its optional start/end window.
    supabase
      .from("offers")
      .select("id", { count: "exact", head: true })
      .eq("store_id", session.storeId)
      .eq("active", true)
      .or(`start_at.is.null,start_at.lte.${now}`)
      .or(`end_at.is.null,end_at.gt.${now}`),
    supabase
      .from("products")
      .select("id, name_ar, name_en, updated_at, active")
      .eq("store_id", session.storeId)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("notification_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("store_id", session.storeId)
      .eq("status", "pending"),
    supabase
      .from("product_reviews")
      .select("id", { count: "exact", head: true })
      .eq("store_id", session.storeId)
      .eq("status", "pending"),
  ]);

  const failed = [activeProducts, outOfStock, onSale].some((r) => r.error);
  const stats = [
    { label: t("stats.activeProducts"), value: activeProducts.count },
    { label: t("stats.onSale"), value: onSale.count },
    { label: t("stats.outOfStock"), value: outOfStock.count },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">
        {t("welcome", { name: session.displayName ?? session.email ?? "" })}
      </h1>

      {params.error === "owner_only" && (
        <p role="status" className="rounded-lg border border-border bg-background px-4 py-3 text-sm">
          {t("ownerOnly")}
        </p>
      )}

      {params.error === "read_only" && (
        <p
          role="status"
          className="rounded-lg border border-border bg-background px-4 py-3 text-sm"
        >
          {t("readOnly")}
        </p>
      )}

      {failed ? (
        <p role="alert" className="text-danger">
          {t("loadError")}
        </p>
      ) : (
        <dl className="grid gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border bg-background p-5"
            >
              <dt className="text-sm text-muted">{stat.label}</dt>
              <dd className="mt-1 text-3xl font-bold">{stat.value ?? 0}</dd>
            </div>
          ))}
        </dl>
      )}

      {session.role !== "viewer" && (
        <nav aria-label={t("shortcuts.title")} className="flex flex-wrap gap-2" data-shortcuts>
          <Link href="/admin/products/new" className={buttonClass("primary", "sm")}>
            {t("shortcuts.addProduct")}
          </Link>
          <Link href="/admin/offers/new" className={buttonClass("secondary", "sm")}>
            {t("shortcuts.addOffer")}
          </Link>
          <Link href="/admin/homepage" className={buttonClass("secondary", "sm")}>
            {t("shortcuts.homepage")}
          </Link>
          <Link href="/admin/settings" className={buttonClass("secondary", "sm")}>
            {t("shortcuts.settings")}
          </Link>
        </nav>
      )}

      {(waiting.count ?? 0) > 0 && (
        <p className="rounded-xl border border-border bg-background px-4 py-3 text-sm" data-waiting-notifications>
          <Link href="/admin/notifications" className="font-medium underline underline-offset-2">
            {t("waitingNotifications", { count: waiting.count ?? 0 })}
          </Link>
        </p>
      )}

      {(reviewsWaiting.count ?? 0) > 0 && (
        <p className="rounded-xl border border-border bg-background px-4 py-3 text-sm" data-waiting-reviews>
          <Link href="/admin/reviews" className="font-medium underline underline-offset-2">
            {t("waitingReviews", { count: reviewsWaiting.count ?? 0 })}
          </Link>
        </p>
      )}

      {recent.data && recent.data.length > 0 && (
        <section aria-labelledby="recent-updates" className="rounded-2xl border border-border bg-background p-5" data-recent-updates>
          <h2 id="recent-updates" className="mb-3 text-lg font-bold">
            {t("recent.title")}
          </h2>
          <ul className="flex flex-col text-sm">
            {recent.data.map((product) => (
              <li key={product.id} className="flex items-center justify-between gap-3 border-t border-border py-2 first:border-0">
                <Link href={`/admin/products/${product.id}`} className="underline-offset-2 hover:underline">
                  {pickLocalized(locale, product.name_ar, product.name_en)}
                </Link>
                <span className="text-muted">
                  {product.active ? "" : `${t("recent.hidden")} · `}
                  {formatDate(product.updated_at, locale)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AnalyticsPanel storeId={session.storeId} days={parseDays(params.days)} />
    </div>
  );
}
