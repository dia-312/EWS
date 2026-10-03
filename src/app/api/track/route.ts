import { getStorefront } from "@/lib/storefront-data";
import { createPublicClient } from "@/lib/supabase/public";
import { trackSchema } from "@/lib/validations/track";

export const dynamic = "force-dynamic";

/**
 * Records one anonymous storefront event (a page or product view, a click on
 * WhatsApp, a search...). Nothing identifying is stored. Always answers 204 for
 * well-formed events, even when saving fails: analytics must never break a page.
 *
 *   POST /api/track  { "type": "product_view", "productId": "<uuid>" }
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = trackSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: { code: "INVALID_INPUT", message: "Unknown or malformed event." } }, { status: 400 });
  }
  const event = parsed.data;

  try {
    const { store } = await getStorefront();
    await createPublicClient().from("analytics_events").insert({
      store_id: store.id,
      event_type: event.type,
      product_id: event.productId ?? null,
      search_query: event.query ?? null,
      session_id: event.sessionId ?? null,
    });
  } catch {
    /* dropped on purpose */
  }
  return new Response(null, { status: 204 });
}
