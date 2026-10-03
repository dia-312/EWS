/** "Tell me when it is back / when the price drops": what a request looks like and when it is ready to be answered. */

export const NOTIFY_TYPES = ["restock", "price_drop"] as const;
export type NotifyType = (typeof NOTIFY_TYPES)[number];

export type ParsedContact = { channel: "email" | "other"; destination: string };

/** Western digits, for numbers typed with Arabic-Indic digits. */
function westernDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
}

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

/**
 * An email address or a phone/WhatsApp number, cleaned up. Phone numbers keep an optional leading
 * + and 7 to 15 digits (spaces, dashes and brackets are dropped). Anything else is refused.
 */
export function parseContact(raw: string): ParsedContact | null {
  const text = westernDigits(raw).trim();
  if (text.length === 0 || text.length > 200) return null;

  if (text.includes("@")) {
    return EMAIL.test(text) ? { channel: "email", destination: text.toLowerCase() } : null;
  }

  const compact = text.replace(/[\s\-().]/g, "");
  if (!/^\+?\d{7,15}$/.test(compact)) return null;
  return { channel: "other", destination: compact };
}

/** The price a visitor pays now: the live offer's price when there is one, otherwise the regular price. */
export function effectivePrice(price: number, offerPrice: number | null): number {
  return offerPrice !== null && offerPrice < price ? offerPrice : price;
}

export type Readiness = "ready" | "waiting" | "notified";

/** Can this request be answered now? A restock request when the product is available again; a price request when it got cheaper. */
export function readiness(
  request: { type: string; status: string; price_at_subscribe: number | null },
  product: { availability: string; price: number; offerPrice: number | null },
): Readiness {
  if (request.status === "notified") return "notified";
  if (request.type === "restock") return product.availability !== "out_of_stock" ? "ready" : "waiting";
  if (request.type === "price_drop") {
    const was = request.price_at_subscribe;
    return was !== null && effectivePrice(product.price, product.offerPrice) < was ? "ready" : "waiting";
  }
  return "waiting";
}
