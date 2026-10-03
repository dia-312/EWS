import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ReviewActions } from "@/components/admin/review-actions";
import { Stars } from "@/components/storefront/stars";
import { buttonClass } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatDate, pickLocalized } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const STATUSES = ["pending", "approved", "rejected"] as const;
type Status = (typeof STATUSES)[number];

export default async function AdminReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  const [session, locale, t, params] = await Promise.all([requireAdmin(), getLocale(), getTranslations("admin.reviews"), searchParams]);
  const requested = Array.isArray(params.status) ? params.status[0] : params.status;
  const status: Status = (STATUSES as readonly string[]).includes(requested ?? "") ? (requested as Status) : "pending";
  const db = await createClient();

  const [{ data, error }, ...counts] = await Promise.all([
    db
      .from("product_reviews")
      .select("id, rating, author_name, comment, status, locale, created_at, products(slug, name_ar, name_en)")
      .eq("store_id", session.storeId)
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(200),
    ...STATUSES.map((value) =>
      db.from("product_reviews").select("id", { count: "exact", head: true }).eq("store_id", session.storeId).eq("status", value),
    ),
  ]);
  const canEdit = session.role !== "viewer";

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("intro")}</p>
      </div>

      <nav aria-label={t("filter")} className="flex flex-wrap gap-2">
        {STATUSES.map((value, index) => (
          <Link
            key={value}
            href={value === "pending" ? "/admin/reviews" : `/admin/reviews?status=${value}`}
            aria-current={value === status ? "true" : undefined}
            className={buttonClass(value === status ? "primary" : "secondary", "sm")}
          >
            {t(`status.${value}`)} ({counts[index].count ?? 0})
          </Link>
        ))}
      </nav>

      {error ? (
        <p role="alert" className="text-danger">
          {t("loadError")}
        </p>
      ) : data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center">
          <p className="font-bold">{t(`empty.${status}`)}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {data.map((review) => (
            <li key={review.id} className={cn("flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-start sm:justify-between")} data-review-row>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars value={review.rating} />
                  <span className="sr-only">{t("stars", { count: review.rating })}</span>
                  <span className="font-medium">{review.author_name || t("anonymous")}</span>
                  <span className="text-xs text-muted">{formatDate(review.created_at, locale)}</span>
                </div>
                {review.products && (
                  <p className="text-sm text-muted">
                    <Link href={`/admin/products?q=${encodeURIComponent(review.products.slug)}`} className="underline-offset-2 hover:underline">
                      {pickLocalized(locale, review.products.name_ar, review.products.name_en)}
                    </Link>
                  </p>
                )}
                {review.comment && <p className="mt-2 whitespace-pre-line">{review.comment}</p>}
              </div>
              {canEdit && <ReviewActions id={review.id} status={review.status as Status} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
