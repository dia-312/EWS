"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/auth";
import { STORE_LOGOS_BUCKET, isValidLogoPath, logoPathFromUrl } from "@/lib/logo";
import { createClient } from "@/lib/supabase/server";

export type LogoActionResult = { error?: "invalid" | "failed" };

/** Records a logo the browser has uploaded and deletes the one it replaces. */
export async function registerStoreLogo(storagePath: string): Promise<LogoActionResult> {
  const session = await requireEditor();
  if (!isValidLogoPath(storagePath, session.storeId)) return { error: "invalid" };

  const db = await createClient();
  const { data: current } = await db
    .from("stores")
    .select("logo_url")
    .eq("id", session.storeId)
    .maybeSingle();

  const publicUrl = db.storage.from(STORE_LOGOS_BUCKET).getPublicUrl(storagePath).data.publicUrl;
  const { error } = await db
    .from("stores")
    .update({ logo_url: publicUrl })
    .eq("id", session.storeId);
  if (error) return { error: "failed" };

  const previous = logoPathFromUrl(current?.logo_url);
  if (previous && previous !== storagePath) {
    await db.storage.from(STORE_LOGOS_BUCKET).remove([previous]);
  }

  revalidatePath("/", "layout");
  return {};
}

export async function removeStoreLogo(): Promise<LogoActionResult> {
  const session = await requireEditor();
  const db = await createClient();

  const { data: current } = await db
    .from("stores")
    .select("logo_url")
    .eq("id", session.storeId)
    .maybeSingle();

  const { error } = await db.from("stores").update({ logo_url: null }).eq("id", session.storeId);
  if (error) return { error: "failed" };

  const previous = logoPathFromUrl(current?.logo_url);
  if (previous) await db.storage.from(STORE_LOGOS_BUCKET).remove([previous]);

  revalidatePath("/", "layout");
  return {};
}
