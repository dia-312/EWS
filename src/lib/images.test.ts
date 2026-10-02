import { describe, expect, it } from "vitest";
import {
  buildImagePath,
  extensionForType,
  isValidImagePath,
  thumbPath,
  thumbUrl,
} from "./images";

const STORE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PRODUCT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const IMAGE = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("image paths", () => {
  it("builds a path scoped to store and product", () => {
    expect(buildImagePath(STORE, PRODUCT, IMAGE, "webp")).toBe(
      `${STORE}/${PRODUCT}/${IMAGE}.webp`,
    );
  });

  it("derives the thumbnail path and url from the full image", () => {
    expect(thumbPath(`${STORE}/${PRODUCT}/${IMAGE}.webp`)).toBe(
      `${STORE}/${PRODUCT}/${IMAGE}-thumb.webp`,
    );
    expect(thumbUrl("https://x.supabase.co/storage/v1/object/public/product-images/a/b/c.jpg")).toBe(
      "https://x.supabase.co/storage/v1/object/public/product-images/a/b/c-thumb.jpg",
    );
  });

  it("picks the extension from the compressed type", () => {
    expect(extensionForType("image/webp")).toBe("webp");
    expect(extensionForType("image/jpeg")).toBe("jpg");
    expect(extensionForType("image/png")).toBe("jpg");
  });
});

describe("isValidImagePath", () => {
  it("accepts a path for the same store and product", () => {
    expect(isValidImagePath(`${STORE}/${PRODUCT}/${IMAGE}.webp`, STORE, PRODUCT)).toBe(true);
    expect(isValidImagePath(`${STORE}/${PRODUCT}/${IMAGE}.jpg`, STORE, PRODUCT)).toBe(true);
  });

  it("rejects other stores, other products, traversal and odd extensions", () => {
    const other = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    expect(isValidImagePath(`${other}/${PRODUCT}/${IMAGE}.webp`, STORE, PRODUCT)).toBe(false);
    expect(isValidImagePath(`${STORE}/${other}/${IMAGE}.webp`, STORE, PRODUCT)).toBe(false);
    expect(isValidImagePath(`${STORE}/${PRODUCT}/../${IMAGE}.webp`, STORE, PRODUCT)).toBe(false);
    expect(isValidImagePath(`${STORE}/${PRODUCT}/${IMAGE}.svg`, STORE, PRODUCT)).toBe(false);
    expect(isValidImagePath(`${STORE}/${PRODUCT}/${IMAGE}-thumb.webp`, STORE, PRODUCT)).toBe(false);
  });
});
