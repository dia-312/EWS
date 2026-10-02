import { describe, expect, it } from "vitest";
import { buildLogoPath, isValidLogoPath, logoPathFromUrl } from "./logo";

const STORE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const LOGO = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("logo paths", () => {
  it("builds and validates a path inside the store folder", () => {
    const path = buildLogoPath(STORE, LOGO, "webp");
    expect(path).toBe(`${STORE}/logo-${LOGO}.webp`);
    expect(isValidLogoPath(path, STORE)).toBe(true);
  });

  it("rejects other stores, traversal and unexpected names", () => {
    const other = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    expect(isValidLogoPath(`${other}/logo-${LOGO}.webp`, STORE)).toBe(false);
    expect(isValidLogoPath(`${STORE}/../logo-${LOGO}.webp`, STORE)).toBe(false);
    expect(isValidLogoPath(`${STORE}/${LOGO}.webp`, STORE)).toBe(false);
    expect(isValidLogoPath(`${STORE}/logo-${LOGO}.svg`, STORE)).toBe(false);
  });

  it("recovers the storage path from a public url", () => {
    const url = `https://x.supabase.co/storage/v1/object/public/store-logos/${STORE}/logo-${LOGO}.webp`;
    expect(logoPathFromUrl(url)).toBe(`${STORE}/logo-${LOGO}.webp`);
    expect(logoPathFromUrl("https://elsewhere.com/logo.png")).toBeNull();
    expect(logoPathFromUrl(null)).toBeNull();
  });
});
