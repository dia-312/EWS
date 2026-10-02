import { getLocale, getTranslations } from "next-intl/server";
import { ProductForm } from "@/components/admin/product-form";
import { requireEditor } from "@/lib/auth";
import { getCurrentStore } from "@/lib/store";
import { createProduct } from "../actions";
import { loadProductFormOptions } from "../options";

export default async function NewProductPage() {
  const session = await requireEditor();
  const [locale, t, store] = await Promise.all([
    getLocale(),
    getTranslations("admin.products.form"),
    getCurrentStore(),
  ]);
  const options = await loadProductFormOptions(session.storeId, locale);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("newTitle")}</h1>
      <ProductForm
        action={createProduct}
        currency={store.currency_code}
        {...options}
      />
    </div>
  );
}
