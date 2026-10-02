"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  parseCategoryForm,
  toFieldErrors,
  type FormErrors,
} from "@/lib/validations/category";

export type CategoryFormState = {
  fieldErrors?: FormErrors;
  formError?: "save_failed";
};

const POSTGRES_UNIQUE_VIOLATION = "23505";

export async function createCategory(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const session = await requireEditor();
  const parsed = parseCategoryForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createClient();

  // New categories go to the end of the list.
  const { data: last } = await supabase
    .from("categories")
    .select("display_order")
    .eq("store_id", session.storeId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("categories").insert({
    ...parsed.data,
    store_id: session.storeId,
    display_order: (last?.display_order ?? 0) + 1,
  });

  if (error) {
    if (error.code === POSTGRES_UNIQUE_VIOLATION) {
      return { fieldErrors: { slug: "slug_taken" } };
    }
    return { formError: "save_failed" };
  }

  revalidatePath("/admin/categories");
  redirect("/admin/categories?saved=created");
}

export async function updateCategory(
  id: string,
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const session = await requireEditor();
  const parsed = parseCategoryForm(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update(parsed.data)
    .eq("id", id)
    .eq("store_id", session.storeId);

  if (error) {
    if (error.code === POSTGRES_UNIQUE_VIOLATION) {
      return { fieldErrors: { slug: "slug_taken" } };
    }
    return { formError: "save_failed" };
  }

  revalidatePath("/admin/categories");
  redirect("/admin/categories?saved=updated");
}

export async function toggleCategoryActive(id: string, active: boolean) {
  const session = await requireEditor();
  const supabase = await createClient();
  await supabase
    .from("categories")
    .update({ active })
    .eq("id", id)
    .eq("store_id", session.storeId);
  revalidatePath("/admin/categories");
}

/** Swaps a category with its neighbour and rewrites orders as 1..n. */
export async function moveCategory(id: string, direction: "up" | "down") {
  const session = await requireEditor();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("categories")
    .select("id")
    .eq("store_id", session.storeId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (!rows) return;

  const ids = rows.map((row) => row.id);
  const from = ids.indexOf(id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= ids.length) return;
  [ids[from], ids[to]] = [ids[to], ids[from]];

  await Promise.all(
    ids.map((categoryId, index) =>
      supabase
        .from("categories")
        .update({ display_order: index + 1 })
        .eq("id", categoryId)
        .eq("store_id", session.storeId),
    ),
  );
  revalidatePath("/admin/categories");
}

export type DeleteCategoryResult = { error?: "has_products" | "delete_failed" };

/** Refuses to delete a category that still has products (they must be moved first). */
export async function deleteCategory(id: string): Promise<DeleteCategoryResult> {
  const session = await requireEditor();
  const supabase = await createClient();

  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", session.storeId)
    .eq("category_id", id);
  if (count) return { error: "has_products" };

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("store_id", session.storeId);
  if (error) return { error: "delete_failed" };

  revalidatePath("/admin/categories");
  return {};
}
