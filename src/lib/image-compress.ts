import { MAX_OUTPUT_BYTES } from "@/lib/images";

export type CompressedImage = { blob: Blob; mimeType: string };

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Resizes an image so its longest edge is at most `maxEdge` and re-encodes it as
 * WebP (JPEG when the browser cannot encode WebP). Runs in the browser, so the
 * server never receives multi-megabyte camera photos. Quality steps down until
 * the result fits the storage limit.
 */
export async function compressImage(file: File, maxEdge: number): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas-unavailable");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  for (const quality of [0.82, 0.7, 0.55, 0.4]) {
    let blob = await canvasToBlob(canvas, "image/webp", quality);
    // Browsers that cannot encode WebP silently return PNG; use JPEG instead.
    if (!blob || blob.type !== "image/webp") {
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
    }
    if (blob && blob.size <= MAX_OUTPUT_BYTES) {
      return { blob, mimeType: blob.type };
    }
  }
  throw new Error("too-large");
}
