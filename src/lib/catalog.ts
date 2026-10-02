import { cache } from "react";
import type { Locale } from "@/config/i18n";
import { PAGE_SIZE, totalPages, type CatalogParams } from "@/lib/catalog-params";
import { createPublicClient } from "@/lib/supabase/public";
import type { Database } from "@/types/database.types";

/** Read-only catalogue queries for the public storefront (anonymous, RLS-limited). */

export type CatalogItem = Database["public"]["Functions"]["search_products"]["Returns"][number];
export type Collection = "featured" | "bestsellers" | "new" | "offers";

export type CatalogPage = {
  items: CatalogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type SearchOptions = {
  storeId: string;
  locale: Locale;
  params?: Partial<CatalogParams>;
  categoryId?: string | null;
  brandIds?: string[] | null;
  collection?: Collection;
  pageSize?: number;
};

export async function searchCatalog({
  storeId,
  locale,
  params = {},
  categoryId = null,
  brandIds = null,
  collection,
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
  });
  if (error) throw new Error(`Catalogue search failed: ${error.message}`);

  const total = Number(data[0]?.total_count ?? 0);
  return { items: data, total, page, pageSize, totalPages: totalPages(total, pageSize) };
}

export const getCategories = cache(async (storeId: string) => {
  const { data, error } = await createPublicClient()
    .from("categories")
    .select("id, slug, name_ar, name_en, description_ar, description_en, image_url, icon")
    .eq("store_id", storeId)
    .eq("active", true)
    .order("display_order", { ascending: true });
  if (error) throw new Error(`Failed to load categories: ${error.message}`);
  return data;
});

export type Category = Awaited<ReturnType<typeof getCategories>>[number];

/** Active brands that have at least one visible product. */
export const getBrands = cache(async (storeId: string) => {
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
});

export type Brand = Awaited<ReturnType<typeof getBrands>>[number];

export const getStoreSettings = cache(async (storeId: string) => {
  const { data, error } = await createPublicClient()
    .from("store_settings")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load store settings: ${error.message}`);
  return data;
});

export type StoreSettings = NonNullable<Awaited<ReturnType<typeof getStoreSettings>>>;

export const getHomepageSections = cache(async (storeId: string) => {
  const { data, error } = await createPublicClient()
    .from("homepage_sections")
    .select("id, type, title_ar, title_en, subtitle_ar, subtitle_en, config")
    .eq("store_id", storeId)
    .eq("active", true)
    .order("display_order", { ascending: true });
  if (error) throw new Error(`Failed to load homepage sections: ${error.message}`);
  return data;
});

export type HomepageSection = Awaited<ReturnType<typeof getHomepageSections>>[number];

/** A product with everything the detail page shows. */
export const getProductBySlug = cache(async (storeId: string, slug: string) => {
  const db = createPublicClient();

  const { data: product, error } = await db
    .from("products")
    .select(
      `id, slug, name_ar, name_en, short_description_ar, short_description_en,
       description_ar, description_en, price, availability, featured, created_at,
       is_new_override, category_id,
       brands(name, slug),
       categories(slug, name_ar, name_en, active),
       product_images(id, public_url, alt_text_ar, alt_text_en, is_primary, display_order),
       product_specs(spec_key, value_ar, value_en, display_order),
       product_badges(badges(key, label_ar, label_en, color, active, display_order))`,
    )
    .eq("store_id", storeId)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Failed to load product: ${error.message}`);
  if (!product || !product.categories?.active) return null;

  // Row level security only returns offers that are live right now.
  const { data: offer } = await db
    .from("offers")
    .select("new_price, old_price, end_at, title_ar, title_en")
    .eq("product_id", product.id)
    .order("new_price", { ascending: true })
    .limit(1)
    .maybeSingle();

  return { ...product, offer };
});

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;
