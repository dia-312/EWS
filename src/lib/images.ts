/** Storage bucket holding product photos (created in the storage migration). */
export const PRODUCT_IMAGES_BUCKET = "product-images";

export const MAX_IMAGES_PER_PRODUCT = 10;

/** Image formats accepted from the admin's device. */
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

/** Largest file the admin may pick, before compression. */
export const MAX_INPUT_BYTES = 20 * 1024 * 1024;

/** Largest compressed file we store (the bucket itself allows 5 MiB). */
export const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;

/** Longest edge, in pixels, of the stored variants. */
export const FULL_SIZE = 1600;
export const THUMB_SIZE = 480;

const STORED_EXTENSIONS = ["webp", "jpg"] as const;

export function extensionForType(mimeType: string): "webp" | "jpg" {
  return mimeType === "image/webp" ? "webp" : "jpg";
}

/** "<store>/<product>/<id>.<ext>" - the first folder is what the storage policy checks. */
export function buildImagePath(
  storeId: string,
  productId: string,
  imageId: string,
  extension: "webp" | "jpg",
) {
  return `${storeId}/${productId}/${imageId}.${extension}`;
}

/** The small variant lives next to the full one: "<id>.webp" -> "<id>-thumb.webp". */
export function thumbPath(path: string) {
  return path.replace(/(\.[a-z0-9]+)$/i, "-thumb$1");
}

export function thumbUrl(publicUrl: string) {
  return thumbPath(publicUrl);
}

/** True when `path` is a well-formed image path for exactly this store and product. */
export function isValidImagePath(path: string, storeId: string, productId: string) {
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `^${escape(storeId)}/${escape(productId)}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(${STORED_EXTENSIONS.join("|")})$`,
  );
  return pattern.test(path);
}
