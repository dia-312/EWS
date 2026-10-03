import { hasLocale } from "next-intl";
import { defaultLocale, locales } from "@/config/i18n";
import { searchCatalog } from "@/lib/catalog";
import { MAX_FAVORITES, parseIdList } from "@/lib/shop-state";
import { getStorefront } from "@/lib/storefront-data";

export const dynamic = "force-dynamic";

/**
 * Public product cards by id, for the favourites page (which only knows ids,
 * saved in the visitor's browser). Same data every visitor would see on the
 * site: hidden or deleted products are simply not returned.
 *
 *   GET /api/products?ids=<uuid>,<uuid>&locale=ar
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ids = parseIdList(url.searchParams.get("ids"), MAX_FAVORITES);
  const requested = url.searchParams.get("locale");
  const locale = hasLocale(locales, requested) ? requested : defaultLocale;

  if (ids.length === 0) return Response.json({ items: [] });

  try {
    const { store } = await getStorefront();
    const page = await searchCatalog({ storeId: store.id, locale, ids, pageSize: ids.length });
    return Response.json(
      { items: page.items, currency: store.currency_code },
      { headers: { "Cache-Control": "public, max-age=30, s-maxage=30" } },
    );
  } catch {
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Could not load the products." } }, { status: 500 });
  }
}
