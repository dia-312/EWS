import { cache } from "react";
import { getStoreSlug } from "@/config/env";
import { resolveTheme } from "@/config/theme";
import type { Category, StoreSettings } from "@/lib/catalog";
import { memoizeAsync } from "@/lib/memo";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * Everything every public page needs, fetched with ONE query: the store, its
 * settings, its theme and its active categories. The database is far from the
 * visitors, so the number of round trips matters more than anything else.
 */
const loadStorefront = memoizeAsync(
  "storefront",
  async (slug: string) => {
    const { data, error } = await createPublicClient()
      .from("stores")
      .select(
        `id, name, slug, currency_code, locale_default, timezone, logo_url,
         store_settings(*),
         store_theme(preset, primary_color, secondary_color, accent_color, surface_color, text_color, font_key, radius),
         categories(id, slug, name_ar, name_en, description_ar, description_en, image_url, icon)`,
      )
      .eq("slug", slug)
      .eq("categories.active", true)
      .order("display_order", { referencedTable: "categories", ascending: true })
      .maybeSingle();

    if (error) throw new Error(`Failed to load the store: ${error.message}`);
    if (!data) throw new Error(`Store "${slug}" not found`);

    const { store_settings, store_theme, categories, ...store } = data;
    return {
      store,
      settings: store_settings as StoreSettings | null,
      theme: resolveTheme(store_theme),
      categories: categories as Category[],
    };
  },
  { scale: 2 },
);

export const getStorefront = cache(() => loadStorefront(getStoreSlug()));
