import { getTranslations } from "next-intl/server";
import { ReviewForm } from "@/components/storefront/review-form";
import { Stars } from "@/components/storefront/stars";
import type { Locale } from "@/config/i18n";
import { formatDate } from "@/lib/format";
import { distribution, REVIEWS_SHOWN, summarize } from "@/lib/reviews";

export type PublicReview = {
  id: string;
  rating: number;
  author_name: string | null;
  comment: string | null;
  created_at: string;
};

/** The product page's reviews: the average, how the stars split, the latest comments and the form to add one. */
export async function ReviewsSection({
  productId,
  reviews,
  locale,
  canWrite,
}: {
  productId: string;
  reviews: PublicReview[];
  locale: Locale;
  canWrite: boolean;
}) {
  const t = await getTranslations("store.reviews");
  const { average, count } = summarize(reviews.map((review) => review.rating));
  const number = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
  const split = distribution(reviews.map((review) => review.rating));

  return (
    <section aria-labelledby="reviews-title" className="flex max-w-3xl flex-col gap-4" data-reviews>
      <h2 id="reviews-title" className="text-xl font-bold">
        {t("title")}
      </h2>

      {count === 0 ? (
        <p className="text-muted">{t("none")}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-6" data-rating-summary>
          <div className="flex flex-col items-start gap-1">
            <p className="text-4xl font-bold" data-rating-average>
              {number.format(average!)}
            </p>
            <Stars value={average!} />
            <p className="text-sm text-muted">{t("count", { count })}</p>
          </div>
          <ul className="flex min-w-48 flex-1 flex-col gap-1 text-sm" aria-label={t("split")}>
            {split.map(({ stars, count: n }) => (
              <li key={stars} className="flex items-center gap-2">
                <span className="w-14 shrink-0">{t("starsShort", { count: stars })}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${(n / count) * 100}%` }} />
                </span>
                <span className="w-6 text-end text-muted">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reviews.length > 0 && (
        <ul className="flex flex-col gap-3">
          {reviews.slice(0, REVIEWS_SHOWN).map((review) => (
            <li key={review.id} className="rounded-xl border border-border bg-background p-4" data-review>
              <div className="flex flex-wrap items-center gap-2">
                <Stars value={review.rating} />
                <span className="sr-only">{t("starsLabel", { count: review.rating })}</span>
                <span className="font-medium">{review.author_name || t("anonymous")}</span>
                <span className="text-xs text-muted">{formatDate(review.created_at, locale)}</span>
              </div>
              {review.comment && <p className="mt-2 whitespace-pre-line">{review.comment}</p>}
            </li>
          ))}
        </ul>
      )}

      {canWrite && <ReviewForm productId={productId} />}
    </section>
  );
}
