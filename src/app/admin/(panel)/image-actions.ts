"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/auth";
import {
  isValidSiteImagePath,
  sanitizeBannerLink,
  siteImageBucket,
  siteImagePathFromUrl,
  type SiteImageKind,
} from "@/lib/site-images";
import { createClient } from "@/lib/supabase/server";

/** What a picture belongs to. */
export type ImageTarget =
  | { kind: "hero" }
  | { kind: "category"; id: string }
  | { kind: "offer"; id: string }
  | { kind: "banner"; id: string };

export type ImageActionResult = { error?: "invalid" | "failed" };

type Db = Awaited<ReturnType<typeof createClient>>;

/** The picture currently stored for a target (a public URL), or undefined when the target does not exist. */
async function currentUrl(db: Db, storeId: string, target: ImageTarget): Promise<string | null | undefined> {
  switch (target.kind) {
    case "hero": {
      const { data } = await db.from("store_settings").select("hero_image_url").eq("store_id", storeId).maybeSingle();
      return data ? data.hero_image_url : null;
    }
    case "category": {
      const { data } = await db.from("categories").select("image_url").eq("id", target.id).eq("store_id", storeId).maybeSingle();
      return data ? data.image_url : undefined;
    }
    case "offer": {
      const { data } = await db.from("offers").select("banner_image_url").eq("id", target.id).eq("store_id", storeId).maybeSingle();
      return data ? data.banner_image_url : undefined;
    }
    case "banner": {
      const { data } = await db.from("homepage_sections").select("config").eq("id", target.id).eq("store_id", storeId).eq("type", "banner").maybeSingle();
      if (!data) return undefined;
      const url = (data.config as { image_url?: unknown } | null)?.image_url;
      return typeof url === "string" ? url : null;
    }
  }
}

async function writeUrl(db: Db, storeId: string, target: ImageTarget, url: string | null): Promise<boolean> {
  switch (target.kind) {
    case "hero": {
      const { error } = await db.from("store_settings").upsert({ store_id: storeId, hero_image_url: url }, { onConflict: "store_id" });
      return !error;
    }
    case "category": {
      const { error } = await db.from("categories").update({ image_url: url }).eq("id", target.id).eq("store_id", storeId);
      return !error;
    }
    case "offer": {
      const { error } = await db.from("offers").update({ banner_image_url: url }).eq("id", target.id).eq("store_id", storeId);
      return !error;
    }
    case "banner": {
      const { data } = await db.from("homepage_sections").select("config").eq("id", target.id).eq("store_id", storeId).maybeSingle();
      const config = data?.config && typeof data.config === "object" && !Array.isArray(data.config) ? data.config : {};
      const next = { ...config, image_url: url };
      const { error } = await db.from("homepage_sections").update({ config: next }).eq("id", target.id).eq("store_id", storeId);
      return !error;
    }
  }
}

/**
 * Records a picture the browser has uploaded (or removes the current one when
 * `storagePath` is null) and deletes the file it replaces.
 */
export async function saveSiteImage(target: ImageTarget, storagePath: string | null): Promise<ImageActionResult> {
  const session = await requireEditor();
  const kind: SiteImageKind = target.kind;
  if (storagePath !== null && !isValidSiteImagePath(storagePath, session.storeId, kind)) return { error: "invalid" };

  const db = await createClient();
  const previousUrl = await currentUrl(db, session.storeId, target);
  if (previousUrl === undefined) return { error: "invalid" };

  const bucket = siteImageBucket(kind);
  const url = storagePath === null ? null : db.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
  if (!(await writeUrl(db, session.storeId, target, url))) return { error: "failed" };

  const previous = siteImagePathFromUrl(previousUrl, kind);
  if (previous && previous !== storagePath) await db.storage.from(bucket).remove([previous]);

  revalidatePath("/", "layout");
  return {};
}

/** The link a promotional banner opens, saved with the banner's other settings. */
export async function saveBannerLink(sectionId: string, link: string): Promise<ImageActionResult> {
  const session = await requireEditor();
  const db = await createClient();

  const { data } = await db
    .from("homepage_sections")
    .select("config")
    .eq("id", sectionId)
    .eq("store_id", session.storeId)
    .eq("type", "banner")
    .maybeSingle();
  if (!data) return { error: "invalid" };

  const clean = sanitizeBannerLink(link);
  if (link.trim() !== "" && clean === null) return { error: "invalid" };

  const config = data.config && typeof data.config === "object" && !Array.isArray(data.config) ? data.config : {};
  const { error } = await db
    .from("homepage_sections")
    .update({ config: { ...config, link_url: clean } })
    .eq("id", sectionId)
    .eq("store_id", session.storeId);
  if (error) return { error: "failed" };

  revalidatePath("/", "layout");
  return {};
}
