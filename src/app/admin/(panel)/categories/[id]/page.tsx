import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CategoryForm } from "@/components/admin/category-form";
import { SiteImageField } from "@/components/admin/site-image-field";
import { requireEditor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateCategory } from "../actions";

export default async function EditCategoryPage({
  params,
}: PageProps<"/admin/categories/[id]">) {
  const [session, { id }, t] = await Promise.all([
    requireEditor(),
    params,
    getTranslations("admin.categories.form"),
  ]);

  const supabase = await createClient();
  const { data: category } = await supabase
    .from("categories")
    .select(
      "name_ar, name_en, slug, description_ar, description_en, icon, active, image_url",
    )
    .eq("id", id)
    .eq("store_id", session.storeId)
    .maybeSingle();
  if (!category) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("editTitle")}</h1>
      <SiteImageField
        storeId={session.storeId}
        target={{ kind: "category", id }}
        imageUrl={category.image_url}
        title={t("image.title")}
        hint={t("image.hint")}
        aspect="1 / 1"
      />
      <CategoryForm action={updateCategory.bind(null, id)} initial={category} />
    </div>
  );
}
