import { z } from "zod";
import { effectivePrice, NOTIFY_TYPES, parseContact } from "@/lib/notify";
import { getStorefront } from "@/lib/storefront-data";
import { createPublicClient } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

const POSTGRES_UNIQUE_VIOLATION = "23505";

const schema = z.object({
  productId: z.uuid(),
  type: z.enum(NOTIFY_TYPES),
  contact: z.string().max(200),
  locale: z.enum(["ar", "en"]),
  consent: z.literal(true),
  /** A field real visitors never see; bots fill it in. */
  website: z.string().max(200).optional(),
});

const error = (code: string, message: string, status: number) => Response.json({ error: { code, message } }, { status });

/**
 * A visitor asks to be told when an out-of-stock product is back, or when a
 * product gets cheaper. Only an email address or phone number and the product are
 * stored; the store's admins read them and contact the visitor.
 *
 *   POST /api/notifications/subscribe
 *   { "productId": "<uuid>", "type": "restock" | "price_drop", "contact": "...", "locale": "ar", "consent": true }
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error("INVALID_INPUT", "The request is not valid.", 400);
  const input = parsed.data;

  // Bots that fill the hidden field are told it worked, and nothing is stored.
  if (input.website) return Response.json({ ok: true }, { status: 201 });

  const contact = parseContact(input.contact);
  if (!contact) return error("INVALID_CONTACT", "Enter a valid email address or phone number.", 422);

  try {
    const { store } = await getStorefront();
    const db = createPublicClient();

    // Row level security only lets visitors see active products, with their live offers.
    const { data: product } = await db
      .from("products")
      .select("id, price, availability, offers(new_price)")
      .eq("id", input.productId)
      .eq("store_id", store.id)
      .maybeSingle();
    if (!product) return error("NOT_FOUND", "This product is not available.", 404);

    if (input.type === "restock" && product.availability !== "out_of_stock") {
      return error("NOT_NEEDED", "This product is in stock.", 409);
    }

    const offerPrices = product.offers.map((offer) => Number(offer.new_price));
    const now = effectivePrice(Number(product.price), offerPrices.length > 0 ? Math.min(...offerPrices) : null);

    const { error: insertError } = await db.from("notification_subscriptions").insert({
      store_id: store.id,
      product_id: product.id,
      type: input.type,
      channel: contact.channel,
      destination: contact.destination,
      price_at_subscribe: input.type === "price_drop" ? now : null,
      locale: input.locale,
    });
    // The same person asking twice is simply already on the list.
    if (insertError && insertError.code !== POSTGRES_UNIQUE_VIOLATION) throw insertError;
  } catch {
    return error("INTERNAL_ERROR", "Could not save your request. Try again.", 500);
  }

  return Response.json({ ok: true }, { status: 201 });
}
