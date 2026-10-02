import type { MetadataRoute } from "next";
import { locales } from "@/config/i18n";
import { getCurrentStore } from "@/lib/store";
import { absoluteUrl } from "@/lib/storefront";
import { createPublicClient } from "@/lib/supabase/public";

// Built from the live catalogue on every request, never at build time.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const store = await getCurrentStore();
  const db = createPublicClient();

  const [{ data: categories }, { data: products }] = await Promise.all([
    db.from("categories").select("slug, updated_at").eq("store_id", store.id).eq("active", true),
    db
      .from("products")
      .select("slug, updated_at, categories!inner(active)")
      .eq("store_id", store.id)
      .eq("categories.active", true)
      .limit(5000),
  ]);

  const entries: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    entries.push({ url: absoluteUrl(locale), changeFrequency: "daily", priority: 1 });
    entries.push({ url: absoluteUrl(locale, "/products"), changeFrequency: "daily", priority: 0.9 });

    for (const category of categories ?? []) {
      entries.push({
        url: absoluteUrl(locale, `/categories/${category.slug}`),
        lastModified: category.updated_at,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
    for (const product of products ?? []) {
      entries.push({
        url: absoluteUrl(locale, `/products/${product.slug}`),
        lastModified: product.updated_at,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }
  return entries;
}
