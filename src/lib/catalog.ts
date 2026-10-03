import { cache } from "react";
import type { Locale } from "@/config/i18n";
import { PAGE_SIZE, totalPages, type CatalogParams } from "@/lib/catalog-params";
import { memoizeAsync } from "@/lib/memo";
import { createPublicClient } from "@/lib/supabase/public";
import type { Database } from "@/types/database.types";

/**
 * Read-only catalogue queries for the public storefront (anonymous, RLS-limited).
 * Results are the same for every visitor, so they go through the short
 * in-memory cache in lib/memo.ts: the database is far from the visitors, and
 * each round trip is the slowest part of a page.
 */

type Tables = Database["public"]["Tables"];

export type CatalogItem = Database["public"]["Functions"]["search_products"]["Returns"][number];
export type Collection = "featured" | "bestsellers" | "new" | "offers";
export type Category = Pick<
  Tables["categories"]["Row"],
  "id" | "slug" | "name_ar" | "name_en" | "description_ar" | "description_en" | "image_url" | "icon"
>;
export type StoreSettings = Tables["store_settings"]["Row"];
export type HomepageSection = Pick<
  Tables["homepage_sections"]["Row"],
  "id" | "type" | "title_ar" | "title_en" | "subtitle_ar" | "subtitle_en" | "config"
>;

export type CatalogPage = {
  items: CatalogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type SearchOptions = {
  storeId: string;
  locale: Locale;
  params?: Partial<CatalogParams>;
  categoryId?: string | null;
  brandIds?: string[] | null;
  collection?: Collection;
  /** Load exactly these products (a visitor's favourites). */
  ids?: string[];
  pageSize?: number;
};

async function runSearch({
  storeId,
  locale,
  params = {},
  categoryId = null,
  brandIds = null,
  collection,
  ids,
  pageSize = PAGE_SIZE,
}: SearchOptions): Promise<CatalogPage> {
  const page = params.page ?? 1;
  const { data, error } = await createPublicClient().rpc("search_products", {
    p_store: storeId,
    p_query: params.q || undefined,
    p_category: categoryId ?? undefined,
    p_brands: brandIds && brandIds.length > 0 ? brandIds : undefined,
    p_min: params.min ?? undefined,
    p_max: params.max ?? undefined,
    p_availability: params.availability && params.availability.length > 0 ? params.availability : undefined,
    p_collection: collection,
    p_on_sale: params.onSale ?? false,
    p_sort: params.sort ?? "newest",
    p_locale: locale,
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
    p_ids: ids && ids.length > 0 ? ids : undefined,
  });
  if (error) throw new Error(`Catalogue search failed: ${error.message}`);

  const total = Number(data[0]?.total_count ?? 0);
  return { items: data, total, page, pageSize, totalPages: totalPages(total, pageSize) };
}

export const searchCatalog = memoizeAsync("search", runSearch);

/** Active brands that have at least one visible product. */
export const getBrands = cache(
  memoizeAsync(
    "brands",
    async (storeId: string) => {
      const { data, error } = await createPublicClient()
        .from("brands")
        .select("id, name, slug, products(count)")
        .eq("store_id", storeId)
        .eq("active", true)
        .order("name", { ascending: true });
      if (error) throw new Error(`Failed to load brands: ${error.message}`);
      return data
        .filter((brand) => (brand.products[0]?.count ?? 0) > 0)
        .map(({ id, name, slug }) => ({ id, name, slug }));
    },
    { scale: 2 },
  ),
);

export type Brand = Awaited<ReturnType<typeof getBrands>>[number];

export const getHomepageSections = cache(
  memoizeAsync(
    "homepage-sections",
    async (storeId: string): Promise<HomepageSection[]> => {
      const { data, error } = await createPublicClient()
        .from("homepage_sections")
        .select("id, type, title_ar, title_en, subtitle_ar, subtitle_en, config")
        .eq("store_id", storeId)
        .eq("active", true)
        .order("display_order", { ascending: true });
      if (error) throw new Error(`Failed to load homepage sections: ${error.message}`);
      return data;
    },
    { scale: 2 },
  ),
);

/** A product with everything the detail page shows, including its live offer, in one query. */
export const getProductBySlug = cache(
  memoizeAsync("product", async (storeId: string, slug: string) => {
    const { data: product, error } = await createPublicClient()
      .from("products")
      .select(
        `id, slug, name_ar, name_en, short_description_ar, short_description_en,
         description_ar, description_en, price, availability, featured, created_at,
         is_new_override, category_id,
         brands(name, slug),
         categories(slug, name_ar, name_en, active),
         product_images(id, public_url, alt_text_ar, alt_text_en, is_primary, display_order),
         product_specs(spec_key, value_ar, value_en, display_order),
         product_badges(badges(key, label_ar, label_en, color, active, display_order)),
         offers(new_price, old_price, end_at, title_ar, title_en)`,
      )
      .eq("store_id", storeId)
      .eq("slug", slug)
      // Row level security only returns offers that are live right now; show the cheapest.
      .order("new_price", { referencedTable: "offers", ascending: true })
      .limit(1, { referencedTable: "offers" })
      .maybeSingle();
    if (error) throw new Error(`Failed to load product: ${error.message}`);
    if (!product || !product.categories?.active) return null;

    const { offers, ...rest } = product;
    return { ...rest, offer: offers[0] ?? null };
  }),
);

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

/**
 * Products with their specifications, for the side-by-side comparison. Returned
 * in the order of `ids`; hidden or deleted products are simply missing.
 */
export const getProductsForCompare = memoizeAsync("compare", async (storeId: string, ids: string[]) => {
  if (ids.length === 0) return [];

  const { data, error } = await createPublicClient()
    .from("products")
    .select(
      `id, slug, name_ar, name_en, price, availability,
       brands(name),
       categories(slug, name_ar, name_en, active),
       product_images(public_url, is_primary, display_order),
       product_specs(spec_key, value_ar, value_en, display_order),
       offers(new_price, old_price, end_at)`,
    )
    .eq("store_id", storeId)
    .in("id", ids)
    .order("new_price", { referencedTable: "offers", ascending: true })
    .limit(1, { referencedTable: "offers" });
  if (error) throw new Error(`Failed to load products to compare: ${error.message}`);

  return ids
    .map((id) => data.find((product) => product.id === id))
    .filter((product): product is NonNullable<typeof product> => Boolean(product?.categories?.active))
    .map(({ offers, ...product }) => ({ ...product, offer: offers[0] ?? null }));
});

export type CompareProduct = Awaited<ReturnType<typeof getProductsForCompare>>[number];
