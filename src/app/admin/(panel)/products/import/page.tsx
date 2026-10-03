import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ProductImport } from "@/components/admin/product-import";
import { buttonClass } from "@/components/ui/button";
import { requireEditor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ImportProductsPage() {
  const [session, t, locale] = await Promise.all([requireEditor(), getTranslations("admin.import"), getLocale()]);

  const db = await createClient();
  const { data } = await db
    .from("categories")
    .select("slug, name_ar, name_en")
    .eq("store_id", session.storeId)
    .order("display_order", { ascending: true });

  const categories = (data ?? []).map((category) => ({
    slug: category.slug,
    name: (locale === "ar" ? category.name_ar : category.name_en) || category.name_ar,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link href="/admin/products" className={buttonClass("secondary")}>
          {t("back")}
        </Link>
      </div>
      <ProductImport categories={categories} />
    </div>
  );
}
