/** Ratings and reviews: what is accepted, and how a list of ratings is summed up. */

export const MAX_COMMENT = 1000;
export const MAX_NAME = 60;
export const REVIEWS_SHOWN = 10;

/** Links in a review are the usual sign of spam, so they are not accepted. */
const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|info|ru|xyz|top|shop|ps|io)\b)/i;

export type ReviewInput = { rating: number; name: string | null; comment: string | null };
export type ReviewProblem = "rating" | "name_too_long" | "comment_too_long" | "has_link";

/** Cleans the text of a review and says what is wrong with it, if anything. */
export function checkReview(raw: { rating: unknown; name?: unknown; comment?: unknown }): { ok: true; review: ReviewInput } | { ok: false; problem: ReviewProblem } {
  const rating = typeof raw.rating === "number" ? raw.rating : Number.NaN;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, problem: "rating" };

  const clean = (value: unknown) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");
  const name = clean(raw.name);
  const comment = typeof raw.comment === "string" ? raw.comment.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim() : "";

  if (name.length > MAX_NAME) return { ok: false, problem: "name_too_long" };
  if (comment.length > MAX_COMMENT) return { ok: false, problem: "comment_too_long" };
  if (LINK.test(name) || LINK.test(comment)) return { ok: false, problem: "has_link" };

  return { ok: true, review: { rating, name: name || null, comment: comment || null } };
}

/** Average (one decimal) and count of a list of ratings; no average when there are none. */
export function summarize(ratings: readonly number[]): { average: number | null; count: number } {
  if (ratings.length === 0) return { average: null, count: 0 };
  const total = ratings.reduce((sum, rating) => sum + rating, 0);
  return { average: Math.round((total / ratings.length) * 10) / 10, count: ratings.length };
}

/** How many reviews gave each number of stars, from 5 down to 1. */
export function distribution(ratings: readonly number[]): { stars: number; count: number }[] {
  return [5, 4, 3, 2, 1].map((stars) => ({ stars, count: ratings.filter((rating) => rating === stars).length }));
}
