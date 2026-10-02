import { pickLocalized } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

/** Products an offer can be attached to, labelled for the UI language. */
export async function loadOfferProductOptions(storeId: string, locale: string) {
  const db = await createClient();
  const { data } = await db
    .from("products")
    .select("id, name_ar, name_en, price")
    .eq("store_id", storeId)
    .order("name_ar", { ascending: true })
    .limit(1000);

  return (data ?? []).map((row) => ({
    id: row.id,
    label: pickLocalized(locale, row.name_ar, row.name_en),
    price: Number(row.price),
  }));
}
