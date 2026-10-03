"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/auth";
import { ADDABLE_SECTION_TYPES, isProductSection, moveId } from "@/lib/homepage";
import { isPermutation } from "@/lib/reorder";
import { createClient } from "@/lib/supabase/server";
import type { FormErrors } from "@/lib/validations/category";
import { parseSectionForm } from "@/lib/validations/homepage";

export type SectionFormState = {
  fieldErrors?: FormErrors;
  formError?: "save_failed";
};

function refresh() {
  revalidatePath("/admin/homepage");
}

/** Swaps a section with its neighbour and rewrites the order as 1..n. */
export async function moveSection(id: string, direction: "up" | "down") {
  const session = await requireEditor();
  const db = await createClient();

  const { data: rows } = await db
    .from("homepage_sections")
    .select("id")
    .eq("store_id", session.storeId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (!rows) return;

  const before = rows.map((row) => row.id);
  const after = moveId(before, id, direction);
  if (after.every((value, index) => value === before[index])) return;

  await Promise.all(
    after.map((sectionId, index) =>
      db
        .from("homepage_sections")
        .update({ display_order: index + 1 })
        .eq("id", sectionId)
        .eq("store_id", session.storeId),
    ),
  );
  refresh();
}

/** Saves the order the owner dragged the sections into. */
export async function reorderSections(ids: string[]): Promise<{ error?: string }> {
  const session = await requireEditor();
  const db = await createClient();

  const { data: rows } = await db.from("homepage_sections").select("id").eq("store_id", session.storeId);
  if (!rows || !isPermutation(ids, rows.map((row) => row.id))) return { error: "invalid" };

  const results = await Promise.all(
    ids.map((sectionId, index) =>
      db.from("homepage_sections").update({ display_order: index + 1 }).eq("id", sectionId).eq("store_id", session.storeId),
    ),
  );
  if (results.some((result) => result.error)) return { error: "failed" };
  refresh();
  return {};
}

export async function toggleSection(id: string, active: boolean) {
  const session = await requireEditor();
  const db = await createClient();
  await db.from("homepage_sections").update({ active }).eq("id", id).eq("store_id", session.storeId);
  refresh();
}

export type DeleteSectionResult = { error?: "delete_failed" };

export async function deleteSection(id: string): Promise<DeleteSectionResult> {
  const session = await requireEditor();
  const db = await createClient();
  const { error } = await db
    .from("homepage_sections")
    .delete()
    .eq("id", id)
    .eq("store_id", session.storeId);
  if (error) return { error: "delete_failed" };

  refresh();
  return {};
}

/** Adds a section of a type the page does not have yet, at the end, then opens it for editing. */
export async function addSection(formData: FormData) {
  const session = await requireEditor();
  const type = String(formData.get("type") ?? "");
  if (!(ADDABLE_SECTION_TYPES as readonly string[]).includes(type)) redirect("/admin/homepage?error=invalid_type");

  const db = await createClient();
  const { data: rows } = await db
    .from("homepage_sections")
    .select("type, display_order")
    .eq("store_id", session.storeId);

  if ((rows ?? []).some((row) => row.type === type)) redirect("/admin/homepage?error=already_added");

  const { data, error } = await db
    .from("homepage_sections")
    .insert({
      store_id: session.storeId,
      type: type as (typeof ADDABLE_SECTION_TYPES)[number],
      display_order: Math.max(0, ...(rows ?? []).map((row) => row.display_order)) + 1,
      active: true,
    })
    .select("id")
    .single();
  if (error) redirect("/admin/homepage?error=add_failed");

  refresh();
  redirect(`/admin/homepage/${data.id}?created=1`);
}

/** Adds a promotional banner at the end. Unlike the other sections, a page can have several. */
export async function addBanner() {
  const session = await requireEditor();
  const db = await createClient();
  const { data: rows } = await db.from("homepage_sections").select("display_order").eq("store_id", session.storeId);

  const { data, error } = await db
    .from("homepage_sections")
    .insert({
      store_id: session.storeId,
      type: "banner",
      display_order: Math.max(0, ...(rows ?? []).map((row) => row.display_order)) + 1,
      active: true,
    })
    .select("id")
    .single();
  if (error) redirect("/admin/homepage?error=add_failed");

  refresh();
  redirect(`/admin/homepage/${data.id}?created=1`);
}

export async function updateSection(
  id: string,
  _prev: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  const session = await requireEditor();
  const db = await createClient();

  const { data: current } = await db
    .from("homepage_sections")
    .select("type, config")
    .eq("id", id)
    .eq("store_id", session.storeId)
    .maybeSingle();
  if (!current) return { formError: "save_failed" };

  const parsed = parseSectionForm(formData, current.type);
  if (!parsed.success) return { fieldErrors: parsed.errors };
  const { limit, ...texts } = parsed.data;

  // Keep any other settings stored in config; only the product limit is managed here.
  const config = {
    ...(current.config && typeof current.config === "object" && !Array.isArray(current.config) ? current.config : {}),
    ...(isProductSection(current.type) && limit !== null ? { limit } : {}),
  };

  const { error } = await db
    .from("homepage_sections")
    .update({ ...texts, config })
    .eq("id", id)
    .eq("store_id", session.storeId);
  if (error) return { formError: "save_failed" };

  refresh();
  redirect("/admin/homepage?saved=1");
}
