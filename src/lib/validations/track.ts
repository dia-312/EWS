import { z } from "zod";

/** The events the storefront reports. No personal data: a random per-tab id at most. */
export const TRACK_EVENTS = [
  "page_view",
  "product_view",
  "qr_scan",
  "search",
  "whatsapp_click",
  "phone_click",
  "share",
  "favorite_add",
  "compare_add",
] as const;

export type TrackEventType = (typeof TRACK_EVENTS)[number];

/** Events that only make sense for one product (contact clicks may come from anywhere on the site). */
const NEEDS_PRODUCT = new Set<string>(["product_view", "qr_scan", "share", "favorite_add", "compare_add"]);

export const trackSchema = z
  .object({
    type: z.enum(TRACK_EVENTS),
    productId: z.uuid().optional(),
    query: z.string().trim().max(200).optional(),
    sessionId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{8,64}$/)
      .optional(),
  })
  .refine((event) => !NEEDS_PRODUCT.has(event.type) || Boolean(event.productId), {
    message: "productId is required",
    path: ["productId"],
  })
  .refine((event) => event.type !== "search" || Boolean(event.query), {
    message: "query is required",
    path: ["query"],
  });

export type TrackPayload = z.infer<typeof trackSchema>;
