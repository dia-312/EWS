/**
 * Pictures the owner puts on the site itself (not on products): the homepage
 * hero, promotional banners, category pictures and offer banners.
 *
 * Files live in public buckets under "<store id>/<kind>-<uuid>.<ext>"; the first
 * folder is what the storage policy checks, so one store can never write into
 * another's folder.
 */

export const SITE_IMAGE_KINDS = ["hero", "banner", "offer", "category"] as const;
export type SiteImageKind = (typeof SITE_IMAGE_KINDS)[number];

const BUCKET: Record<SiteImageKind, string> = {
  hero: "store-banners",
  banner: "store-banners",
  offer: "store-banners",
  category: "category-images",
};

/** Longest edge, in pixels, of the stored picture. */
export const SITE_IMAGE_MAX_EDGE: Record<SiteImageKind, number> = {
  hero: 1920,
  banner: 1600,
  offer: 1600,
  category: 640,
};

export function siteImageBucket(kind: SiteImageKind): string {
  return BUCKET[kind];
}

export function buildSiteImagePath(storeId: string, kind: SiteImageKind, id: string, extension: "webp" | "jpg") {
  return `${storeId}/${kind}-${id}.${extension}`;
}

export function isValidSiteImagePath(path: string, storeId: string, kind: SiteImageKind) {
  const escaped = storeId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `^${escaped}/${kind}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(webp|jpg)$`,
  ).test(path);
}

/** Storage path of one of our pictures from its public URL, or null when the URL is not ours. */
export function siteImagePathFromUrl(url: string | null | undefined, kind: SiteImageKind): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${BUCKET[kind]}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
}

/** A link a banner may point to: a path on this site, or an https address. Anything else is dropped. */
export function sanitizeBannerLink(value: string | null | undefined): string | null {
  const link = (value ?? "").trim();
  if (link === "") return null;
  if (link.startsWith("/") && !link.startsWith("//") && !/[\s\\]/.test(link)) return link;
  try {
    const url = new URL(link);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
