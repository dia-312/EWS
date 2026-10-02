"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormErrors } from "@/lib/validations/category";
import { parseOfferForm, type OfferInput } from "@/lib/validations/offer";

export type OfferFormState = {
  fieldErrors?: FormErrors;
  formError?: "save_failed";
};

type Db = Awaited<ReturnType<typeof createClient>>;

async function storeTimeZone(db: Db, storeId: string) {
  const { data } = await db.from("stores").select("timezone").eq("id", storeId).maybeSingle();
  return data?.timezone ?? "UTC";
}

/**
 * Validates the form and the rules that need the product: it must belong to the
 * store, and the offer must really be cheaper than the old price (which defaults
 * to the product's regular price when left empty).
 */
async function validate(db: Db, storeId: string, formData: FormData) {
  const parsed = parseOfferForm(formData, await storeTimeZone(db, storeId));
  if (!parsed.success) return { errors: parsed.errors } as const;
  const input = parsed.data;

  const { data: product } = await db
    .from("products")
    .select("id, price")
    .eq("id", input.product_id)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!product) return { errors: { product_id: "product_required" } as FormErrors } as const;

  const oldPrice = input.old_price ?? Number(product.price);
  if (!(input.new_price < oldPrice)) {
    return { errors: { new_price: "not_cheaper" } as FormErrors } as const;
  }

  return { input, oldPrice } as const;
}

function columns(input: OfferInput, oldPrice: number) {
  return {
    product_id: input.product_id,
    title_ar: input.title_ar,
    title_en: input.title_en,
    old_price: oldPrice,
    new_price: input.new_price,
    start_at: input.start_at,
    end_at: input.end_at,
    active: input.active,
  };
}

export async function createOffer(_prev: OfferFormState, formData: FormData): Promise<OfferFormState> {
  const session = await requireEditor();
  const db = await createClient();

  const result = await validate(db, session.storeId, formData);
  if ("errors" in result) return { fieldErrors: result.errors };

  const { error } = await db
    .from("offers")
    .insert({ ...columns(result.input, result.oldPrice), store_id: session.storeId });
  if (error) return { formError: "save_failed" };

  revalidatePath("/admin/offers");
  redirect("/admin/offers?saved=created");
}

export async function updateOffer(
  id: string,
  _prev: OfferFormState,
  formData: FormData,
): Promise<OfferFormState> {
  const session = await requireEditor();
  const db = await createClient();

  const result = await validate(db, session.storeId, formData);
  if ("errors" in result) return { fieldErrors: result.errors };

  const { data, error } = await db
    .from("offers")
    .update(columns(result.input, result.oldPrice))
    .eq("id", id)
    .eq("store_id", session.storeId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { formError: "save_failed" };

  revalidatePath("/admin/offers");
  redirect("/admin/offers?saved=updated");
}

export async function toggleOfferActive(id: string, active: boolean) {
  const session = await requireEditor();
  const db = await createClient();
  await db.from("offers").update({ active }).eq("id", id).eq("store_id", session.storeId);
  revalidatePath("/admin/offers");
}

export type DeleteOfferResult = { error?: "delete_failed" };

export async function deleteOffer(id: string): Promise<DeleteOfferResult> {
  const session = await requireEditor();
  const db = await createClient();
  const { error } = await db.from("offers").delete().eq("id", id).eq("store_id", session.storeId);
  if (error) return { error: "delete_failed" };

  revalidatePath("/admin/offers");
  return {};
}
