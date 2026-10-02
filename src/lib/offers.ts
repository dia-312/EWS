export type OfferStatus = "live" | "scheduled" | "expired" | "inactive";

export const OFFER_STATUSES: readonly OfferStatus[] = ["live", "scheduled", "expired", "inactive"];

type OfferTiming = { active: boolean; start_at: string | null; end_at: string | null };

/**
 * Where an offer is in its life. The storefront shows an offer only while it is
 * "live": active, started (or no start) and not yet ended (or no end).
 */
export function offerStatus(offer: OfferTiming, now: Date = new Date()): OfferStatus {
  if (!offer.active) return "inactive";
  if (offer.end_at && new Date(offer.end_at) <= now) return "expired";
  if (offer.start_at && new Date(offer.start_at) > now) return "scheduled";
  return "live";
}

/** Whole-number discount of newPrice compared to oldPrice, or null if it is not cheaper. */
export function discountPercent(oldPrice: number, newPrice: number): number | null {
  if (!(oldPrice > 0) || !(newPrice < oldPrice)) return null;
  return Math.round(((oldPrice - newPrice) / oldPrice) * 100);
}
