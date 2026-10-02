import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ProductForm } from "@/components/admin/product-form";
import { requireEditor } from "@/lib/auth";
import { getCurrentStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import { updateProduct } from "../actions";
import { loadProductFormOptions } from "../options";

export default async function EditProductPage({
  params,
}: PageProps<"/admin/products/[id]">) {
  const [session, { id }, locale, t, store] = await Promise.all([
    requireEditor(),
    params,
    getLocale(),
    getTranslations("admin.products.form"),
    getCurrentStore(),
  ]);

  const db = await createClient();
  const [{ data: product }, options] = await Promise.all([
    db
      .from("products")
      .select(
        "*, product_specs(spec_key, value_ar, value_en, display_order), product_badges(badge_id)",
      )
      .eq("id", id)
      .eq("store_id", session.storeId)
      .maybeSingle(),
    loadProductFormOptions(session.storeId, locale),
  ]);
  if (!product) notFound();

  const specs = [...product.product_specs]
    .sort((a, b) => a.display_order - b.display_order)
    .map(({ spec_key, value_ar, value_en }) => ({ spec_key, value_ar, value_en }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("editTitle")}</h1>
      <ProductForm
        action={updateProduct.bind(null, id)}
        currency={store.currency_code}
        initial={{
          ...product,
          specs,
          badge_ids: product.product_badges.map((badge) => badge.badge_id),
        }}
        {...options}
      />
    </div>
  );
}
