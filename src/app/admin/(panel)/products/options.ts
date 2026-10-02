import { pickLocalized } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

/** Categories, brands and badges offered by the product form, labelled for the UI language. */
export async function loadProductFormOptions(storeId: string, locale: string) {
  const db = await createClient();

  const [categories, brands, badges] = await Promise.all([
    db
      .from("categories")
      .select("id, name_ar, name_en")
      .eq("store_id", storeId)
      .order("display_order", { ascending: true }),
    db
      .from("brands")
      .select("id, name")
      .eq("store_id", storeId)
      .order("name", { ascending: true }),
    db
      .from("badges")
      .select("id, label_ar, label_en")
      .eq("store_id", storeId)
      .eq("active", true)
      .order("display_order", { ascending: true }),
  ]);

  return {
    categories: (categories.data ?? []).map((row) => ({
      id: row.id,
      label: pickLocalized(locale, row.name_ar, row.name_en),
    })),
    brands: (brands.data ?? []).map((row) => ({ id: row.id, label: row.name })),
    badges: (badges.data ?? []).map((row) => ({
      id: row.id,
      label: pickLocalized(locale, row.label_ar, row.label_en),
    })),
  };
}
