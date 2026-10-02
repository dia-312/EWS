"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireEditor } from "@/lib/auth";
import {
  isValidImagePath,
  MAX_IMAGES_PER_PRODUCT,
  PRODUCT_IMAGES_BUCKET,
  thumbPath,
} from "@/lib/images";
import { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;

export type ImageActionResult = { error?: "limit" | "invalid" | "failed" };

function refresh(productId: string) {
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
}

/** Confirms the product belongs to the signed-in admin's store. */
async function ownsProduct(db: Db, storeId: string, productId: string) {
  const { data } = await db
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("store_id", storeId)
    .maybeSingle();
  return Boolean(data);
}

/** Loads an image row together with the product it belongs to, for ownership checks. */
async function loadImage(db: Db, storeId: string, imageId: string) {
  const { data } = await db
    .from("product_images")
    .select("id, product_id, storage_path, is_primary, display_order, products!inner(store_id)")
    .eq("id", imageId)
    .eq("products.store_id", storeId)
    .maybeSingle();
  return data;
}

/**
 * Records an image the browser has already uploaded to storage. The first image
 * of a product becomes its primary image.
 */
export async function registerProductImage(
  productId: string,
  storagePath: string,
): Promise<ImageActionResult> {
  const session = await requireEditor();
  if (!isValidImagePath(storagePath, session.storeId, productId)) {
    return { error: "invalid" };
  }

  const db = await createClient();
  if (!(await ownsProduct(db, session.storeId, productId))) return { error: "invalid" };

  const { data: existing, error: listError } = await db
    .from("product_images")
    .select("display_order, is_primary")
    .eq("product_id", productId);
  if (listError) return { error: "failed" };
  if (existing.length >= MAX_IMAGES_PER_PRODUCT) return { error: "limit" };

  const publicUrl = db.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(storagePath).data.publicUrl;
  const { error } = await db.from("product_images").insert({
    product_id: productId,
    storage_path: storagePath,
    public_url: publicUrl,
    display_order: Math.max(0, ...existing.map((row) => row.display_order)) + 1,
    is_primary: !existing.some((row) => row.is_primary),
  });
  if (error) return { error: "failed" };

  refresh(productId);
  return {};
}

export async function setPrimaryImage(imageId: string): Promise<ImageActionResult> {
  const session = await requireEditor();
  const db = await createClient();
  const image = await loadImage(db, session.storeId, imageId);
  if (!image) return { error: "invalid" };

  // The unique index allows one primary per product, so clear the old one first.
  const cleared = await db
    .from("product_images")
    .update({ is_primary: false })
    .eq("product_id", image.product_id)
    .eq("is_primary", true);
  if (cleared.error) return { error: "failed" };

  const { error } = await db.from("product_images").update({ is_primary: true }).eq("id", imageId);
  if (error) return { error: "failed" };

  refresh(image.product_id);
  return {};
}

/** Swaps an image with its neighbour and rewrites the order as 1..n. */
export async function moveProductImage(
  imageId: string,
  direction: "earlier" | "later",
): Promise<ImageActionResult> {
  const session = await requireEditor();
  const db = await createClient();
  const image = await loadImage(db, session.storeId, imageId);
  if (!image) return { error: "invalid" };

  const { data: rows } = await db
    .from("product_images")
    .select("id")
    .eq("product_id", image.product_id)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (!rows) return { error: "failed" };

  const ids = rows.map((row) => row.id);
  const from = ids.indexOf(imageId);
  const to = direction === "earlier" ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= ids.length) return {};
  [ids[from], ids[to]] = [ids[to], ids[from]];

  const results = await Promise.all(
    ids.map((id, index) =>
      db.from("product_images").update({ display_order: index + 1 }).eq("id", id),
    ),
  );
  if (results.some((result) => result.error)) return { error: "failed" };

  refresh(image.product_id);
  return {};
}

const altSchema = z.object({
  alt_text_ar: z.string().trim().max(200),
  alt_text_en: z.string().trim().max(200),
});

export async function updateImageAlt(
  imageId: string,
  alt: { alt_text_ar: string; alt_text_en: string },
): Promise<ImageActionResult> {
  const session = await requireEditor();
  const parsed = altSchema.safeParse(alt);
  if (!parsed.success) return { error: "invalid" };

  const db = await createClient();
  const image = await loadImage(db, session.storeId, imageId);
  if (!image) return { error: "invalid" };

  const { error } = await db
    .from("product_images")
    .update({
      alt_text_ar: parsed.data.alt_text_ar || null,
      alt_text_en: parsed.data.alt_text_en || null,
    })
    .eq("id", imageId);
  if (error) return { error: "failed" };

  refresh(image.product_id);
  return {};
}

/** Deletes the image row and both stored files; a new primary is chosen if needed. */
export async function deleteProductImage(imageId: string): Promise<ImageActionResult> {
  const session = await requireEditor();
  const db = await createClient();
  const image = await loadImage(db, session.storeId, imageId);
  if (!image) return { error: "invalid" };

  const { error } = await db.from("product_images").delete().eq("id", imageId);
  if (error) return { error: "failed" };

  // Storage cleanup is best effort: an orphaned file is harmless, a dangling row is not.
  await db.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .remove([image.storage_path, thumbPath(image.storage_path)]);

  if (image.is_primary) {
    const { data: next } = await db
      .from("product_images")
      .select("id")
      .eq("product_id", image.product_id)
      .order("display_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next) {
      await db.from("product_images").update({ is_primary: true }).eq("id", next.id);
    }
  }

  refresh(image.product_id);
  return {};
}
