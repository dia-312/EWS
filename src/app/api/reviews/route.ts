import { z } from "zod";
import { checkReview } from "@/lib/reviews";
import { getStorefront } from "@/lib/storefront-data";
import { createPublicClient } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

const schema = z.object({
  productId: z.uuid(),
  rating: z.number(),
  name: z.string().max(200).optional(),
  comment: z.string().max(5000).optional(),
  locale: z.enum(["ar", "en"]),
  /** A field real visitors never see; bots fill it in. */
  website: z.string().max(200).optional(),
});

const error = (code: string, message: string, status: number) => Response.json({ error: { code, message } }, { status });

/**
 * A visitor rates a product, with an optional name and comment. The review is kept
 * as "pending": it appears on the site only after the store approves it.
 *
 *   POST /api/reviews  { "productId": "<uuid>", "rating": 5, "name": "Sara", "comment": "...", "locale": "ar" }
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error("INVALID_INPUT", "The request is not valid.", 400);
  const input = parsed.data;

  // Bots that fill the hidden field are told it worked, and nothing is stored.
  if (input.website) return Response.json({ ok: true }, { status: 201 });

  const checked = checkReview({ rating: input.rating, name: input.name, comment: input.comment });
  if (!checked.ok) return error(checked.problem === "rating" ? "INVALID_INPUT" : "INVALID_REVIEW", checked.problem, checked.problem === "rating" ? 400 : 422);

  try {
    const { store } = await getStorefront();
    const db = createPublicClient();

    // Row level security only lets visitors see products that are on sale.
    const { data: product } = await db.from("products").select("id").eq("id", input.productId).eq("store_id", store.id).maybeSingle();
    if (!product) return error("NOT_FOUND", "This product is not available.", 404);

    const { error: insertError } = await db.from("product_reviews").insert({
      store_id: store.id,
      product_id: product.id,
      rating: checked.review.rating,
      author_name: checked.review.name,
      comment: checked.review.comment,
      locale: input.locale,
    });
    if (insertError) throw insertError;
  } catch {
    return error("INTERNAL_ERROR", "Could not save your review. Try again.", 500);
  }

  return Response.json({ ok: true }, { status: 201 });
}
