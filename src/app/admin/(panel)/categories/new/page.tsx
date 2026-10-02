import { getTranslations } from "next-intl/server";
import { CategoryForm } from "@/components/admin/category-form";
import { requireEditor } from "@/lib/auth";
import { createCategory } from "../actions";

export default async function NewCategoryPage() {
  await requireEditor();
  const t = await getTranslations("admin.categories.form");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("newTitle")}</h1>
      <CategoryForm action={createCategory} />
    </div>
  );
}
