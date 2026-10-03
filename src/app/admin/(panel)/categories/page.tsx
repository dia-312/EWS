import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CategoryRowActions } from "@/components/admin/category-row-actions";
import { SortableTableBody } from "@/components/admin/sortable";
import { buttonClass } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/server";
import { reorderCategories } from "./actions";

export default async function AdminCategoriesPage({
  searchParams,
}: PageProps<"/admin/categories">) {
  const [session, t, tSortable, params] = await Promise.all([
    requireAdmin(),
    getTranslations("admin.categories"),
    getTranslations("admin.sortable"),
    searchParams,
  ]);
  const supabase = await createClient();

  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name_ar, name_en, slug, active, products(count)")
    .eq("store_id", session.storeId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  const saved = params.saved === "created" || params.saved === "updated"
    ? params.saved
    : undefined;
  const canEdit = session.role !== "viewer";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        {canEdit && (
          <Link href="/admin/categories/new" className={buttonClass("primary")}>
            {t("add")}
          </Link>
        )}
      </div>

      {saved && (
        <p
          role="status"
          className="rounded-lg border border-border bg-background px-4 py-3 text-sm"
        >
          {t(`notices.${saved}`)}
        </p>
      )}

      {error ? (
        <p role="alert" className="text-danger">
          {t("loadError")}
        </p>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center">
          <p className="font-bold">{t("empty.title")}</p>
          <p className="mt-1 text-sm text-muted">{t("empty.body")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-background">
          <table className="w-full min-w-[40rem] text-start text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th scope="col" className="w-12 px-4 py-3">
                  <span className="sr-only">{tSortable("handle")}</span>
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  {t("columns.name")}
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  {t("columns.slug")}
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  {t("columns.products")}
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  {t("columns.status")}
                </th>
                {canEdit && (
                  <th scope="col" className="px-4 py-3 text-start font-medium">
                    {t("columns.actions")}
                  </th>
                )}
              </tr>
            </thead>
            <SortableTableBody
              rowClassName="border-b border-border last:border-0"
              onReorder={reorderCategories}
              disabled={!canEdit}
              items={categories.map((category, index) => ({
                id: category.id,
                label: category.name_ar,
                cells: (
                  <>
                    <td className="px-4 py-3">
                      <div className="font-medium">{category.name_ar}</div>
                      {category.name_en && (
                        <div className="text-xs text-muted" dir="ltr">
                          {category.name_en}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted" dir="ltr">
                      {category.slug}
                    </td>
                    <td className="px-4 py-3">{category.products[0]?.count ?? 0}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          category.active ? "bg-green-100 text-green-800" : "bg-surface text-muted",
                        )}
                      >
                        {t(category.active ? "status.active" : "status.inactive")}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <CategoryRowActions
                          id={category.id}
                          name={category.name_ar}
                          active={category.active}
                          isFirst={index === 0}
                          isLast={index === categories.length - 1}
                        />
                      </td>
                    )}
                  </>
                ),
              }))}
            />
          </table>
        </div>
      )}
    </div>
  );
}
