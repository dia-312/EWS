"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireEditor } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";
import type { FormErrors } from "@/lib/validations/category";
import {
  hasDuplicateSpecKeys,
  parseProductForm,
  toProductFieldErrors,
  type ProductInput,
} from "@/lib/validations/product";

export type ProductFormState = {
  fieldErrors?: FormErrors;
  formError?: "save_failed";
};

type Db = Awaited<ReturnType<typeof createClient>>;

const POSTGRES_UNIQUE_VIOLATION = "23505";

/** Uses the typed brand id, or finds/creates a brand from the "new brand" field. */
async function resolveBrandId(db: Db, storeId: string, input: ProductInput) {
  if (!input.new_brand) return input.brand_id;

  const slug = slugify(input.new_brand) || `brand-${randomBytes(3).toString("hex")}`;
  const { data, error } = await db
    .from("brands")
    .upsert(
      { store_id: storeId, name: input.new_brand, slug },
      { onConflict: "store_id,slug" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/**
 * Brings a product's specs and badges in line with the form. Rows are upserted
 * first and stale ones removed after, so a failure never leaves the product
 * with fewer specs than it had.
 */
async function saveRelations(
  db: Db,
  productId: string,
  specs: ProductInput["specs"],
  badgeIds: string[],
) {
  if (specs.length > 0) {
    const { error } = await db.from("product_specs").upsert(
      specs.map((spec, index) => ({
        product_id: productId,
        spec_key: spec.spec_key,
        value_ar: spec.value_ar,
        value_en: spec.value_en,
        display_order: index + 1,
      })),
      { onConflict: "product_id,spec_key" },
    );
    if (error) throw error;
  }

  const { data: existingSpecs, error: specsError } = await db
    .from("product_specs")
    .select("spec_key")
    .eq("product_id", productId);
  if (specsError) throw specsError;

  const keep = new Set(specs.map((spec) => spec.spec_key));
  const staleKeys = existingSpecs
    .map((row) => row.spec_key)
    .filter((key) => !keep.has(key));
  if (staleKeys.length > 0) {
    const { error } = await db
      .from("product_specs")
      .delete()
      .eq("product_id", productId)
      .in("spec_key", staleKeys);
    if (error) throw error;
  }

  const { data: existingBadges, error: badgesError } = await db
    .from("product_badges")
    .select("badge_id")
    .eq("product_id", productId);
  if (badgesError) throw badgesError;

  const have = new Set(existingBadges.map((row) => row.badge_id));
  const wanted = new Set(badgeIds);
  const toAdd = badgeIds.filter((id) => !have.has(id));
  const toRemove = [...have].filter((id) => !wanted.has(id));

  if (toAdd.length > 0) {
    const { error } = await db
      .from("product_badges")
      .insert(toAdd.map((badge_id) => ({ product_id: productId, badge_id })));
    if (error) throw error;
  }
  if (toRemove.length > 0) {
    const { error } = await db
      .from("product_badges")
      .delete()
      .eq("product_id", productId)
      .in("badge_id", toRemove);
    if (error) throw error;
  }
}

/** Columns of the products table that come straight from the form. */
function productColumns(input: ProductInput, brandId: string | null) {
  return {
    category_id: input.category_id,
    brand_id: brandId,
    name_ar: input.name_ar,
    name_en: input.name_en,
    slug: input.slug,
    short_description_ar: input.short_description_ar,
    short_description_en: input.short_description_en,
    description_ar: input.description_ar,
    description_en: input.description_en,
    price: input.price,
    availability: input.availability,
    active: input.active,
    featured: input.featured,
    bestseller_manual: input.bestseller_manual,
    is_new_override: input.is_new_override,
    sort_order: input.sort_order,
    search_aliases: input.search_aliases,
  };
}

function validate(formData: FormData) {
  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { errors: toProductFieldErrors(parsed.error) } as const;
  }
  if (hasDuplicateSpecKeys(parsed.data.specs)) {
    return { errors: { specs: "duplicate_spec" } as FormErrors } as const;
  }
  return { data: parsed.data } as const;
}

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const session = await requireEditor();
  const result = validate(formData);
  if ("errors" in result) return { fieldErrors: result.errors };
  const input = result.data;

  const db = await createClient();
  let productId: string | undefined;
  try {
    const brandId = await resolveBrandId(db, session.storeId, input);
    const { data, error } = await db
      .from("products")
      .insert({ ...productColumns(input, brandId), store_id: session.storeId })
      .select("id")
      .single();
    if (error) {
      if (error.code === POSTGRES_UNIQUE_VIOLATION) {
        return { fieldErrors: { slug: "slug_taken" } };
      }
      throw error;
    }
    productId = data.id;
    await saveRelations(db, productId, input.specs, input.badge_ids);
  } catch {
    // Do not leave a half-saved product behind.
    if (productId) await db.from("products").delete().eq("id", productId);
    return { formError: "save_failed" };
  }

  revalidatePath("/admin/products");
  redirect("/admin/products?saved=created");
}

export async function updateProduct(
  id: string,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const session = await requireEditor();
  const result = validate(formData);
  if ("errors" in result) return { fieldErrors: result.errors };
  const input = result.data;

  const db = await createClient();
  try {
    const brandId = await resolveBrandId(db, session.storeId, input);
    const { data, error } = await db
      .from("products")
      .update(productColumns(input, brandId))
      .eq("id", id)
      .eq("store_id", session.storeId)
      .select("id")
      .maybeSingle();
    if (error) {
      if (error.code === POSTGRES_UNIQUE_VIOLATION) {
        return { fieldErrors: { slug: "slug_taken" } };
      }
      throw error;
    }
    if (!data) return { formError: "save_failed" };
    await saveRelations(db, id, input.specs, input.badge_ids);
  } catch {
    return { formError: "save_failed" };
  }

  revalidatePath("/admin/products");
  redirect("/admin/products?saved=updated");
}

export async function toggleProductActive(id: string, active: boolean) {
  const session = await requireEditor();
  const db = await createClient();
  await db
    .from("products")
    .update({ active })
    .eq("id", id)
    .eq("store_id", session.storeId);
  revalidatePath("/admin/products");
}

export type DeleteProductResult = { error?: "delete_failed" };

export async function deleteProduct(id: string): Promise<DeleteProductResult> {
  const session = await requireEditor();
  const db = await createClient();
  const { error } = await db
    .from("products")
    .delete()
    .eq("id", id)
    .eq("store_id", session.storeId);
  if (error) return { error: "delete_failed" };

  revalidatePath("/admin/products");
  return {};
}

/** Copies a product (hidden, with a unique slug) and opens the copy for editing. */
export async function duplicateProduct(id: string) {
  const session = await requireEditor();
  const t = await getTranslations("admin.products");
  const db = await createClient();

  const { data: source } = await db
    .from("products")
    .select("*, product_specs(spec_key, value_ar, value_en, display_order), product_badges(badge_id)")
    .eq("id", id)
    .eq("store_id", session.storeId)
    .maybeSingle();
  if (!source) return;

  const { product_specs: specs, product_badges: badges } = source;
  // Only content columns are copied; ids, timestamps and search_text are regenerated.
  const columns = {
    store_id: source.store_id,
    category_id: source.category_id,
    brand_id: source.brand_id,
    name_en: source.name_en,
    short_description_ar: source.short_description_ar,
    short_description_en: source.short_description_en,
    description_ar: source.description_ar,
    description_en: source.description_en,
    price: source.price,
    availability: source.availability,
    bestseller_manual: source.bestseller_manual,
    is_new_override: source.is_new_override,
    sort_order: source.sort_order,
    search_aliases: source.search_aliases,
  };

  let copyId: string | undefined;
  for (let attempt = 1; attempt <= 6 && !copyId; attempt++) {
    const suffix = attempt === 1 ? "-copy" : `-copy-${attempt}`;
    const { data, error } = await db
      .from("products")
      .insert({
        ...columns,
        slug: `${source.slug}${suffix}`.slice(0, 80),
        name_ar: `${source.name_ar} ${t("copySuffix")}`,
        active: false,
        featured: false,
      })
      .select("id")
      .single();
    if (data) copyId = data.id;
    else if (error?.code !== POSTGRES_UNIQUE_VIOLATION) return;
  }
  if (!copyId) return;

  await saveRelations(
    db,
    copyId,
    specs.map(({ spec_key, value_ar, value_en }) => ({ spec_key, value_ar, value_en })),
    badges.map((badge) => badge.badge_id),
  );

  revalidatePath("/admin/products");
  redirect(`/admin/products/${copyId}`);
}
