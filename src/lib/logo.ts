/** Storage bucket holding store logos (created in the storage migration). */
export const STORE_LOGOS_BUCKET = "store-logos";

/** Longest edge, in pixels, of the stored logo. */
export const LOGO_MAX_EDGE = 512;

/** "<store>/logo-<id>.<ext>" - the first folder is what the storage policy checks. */
export function buildLogoPath(storeId: string, logoId: string, extension: "webp" | "jpg") {
  return `${storeId}/logo-${logoId}.${extension}`;
}

export function isValidLogoPath(path: string, storeId: string) {
  const escaped = storeId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `^${escaped}/logo-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(webp|jpg)$`,
  ).test(path);
}

/** Storage path of a logo from its public URL, or null if the URL is not ours. */
export function logoPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${STORE_LOGOS_BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
}
