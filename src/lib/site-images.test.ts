import { describe, expect, it } from "vitest";
import {
  buildSiteImagePath,
  isValidSiteImagePath,
  sanitizeBannerLink,
  siteImageBucket,
  siteImagePathFromUrl,
} from "./site-images";

const STORE = "11111111-1111-4111-8111-111111111111";
const ID = "22222222-2222-4222-8222-222222222222";

describe("site image paths", () => {
  it("builds a path inside the store's own folder and accepts exactly that shape", () => {
    const path = buildSiteImagePath(STORE, "hero", ID, "webp");
    expect(path).toBe(`${STORE}/hero-${ID}.webp`);
    expect(isValidSiteImagePath(path, STORE, "hero")).toBe(true);
  });

  it("rejects another store's folder, another kind, odd extensions and path tricks", () => {
    const path = buildSiteImagePath(STORE, "hero", ID, "webp");
    expect(isValidSiteImagePath(path, "33333333-3333-4333-8333-333333333333", "hero")).toBe(false);
    expect(isValidSiteImagePath(path, STORE, "banner")).toBe(false);
    expect(isValidSiteImagePath(`${STORE}/hero-${ID}.svg`, STORE, "hero")).toBe(false);
    expect(isValidSiteImagePath(`${STORE}/../${STORE}/hero-${ID}.webp`, STORE, "hero")).toBe(false);
    expect(isValidSiteImagePath(`${STORE}/sub/hero-${ID}.webp`, STORE, "hero")).toBe(false);
  });

  it("uses the right bucket per kind", () => {
    expect(siteImageBucket("hero")).toBe("store-banners");
    expect(siteImageBucket("offer")).toBe("store-banners");
    expect(siteImageBucket("category")).toBe("category-images");
  });

  it("finds the storage path in one of our public URLs only", () => {
    const url = `https://x.supabase.co/storage/v1/object/public/store-banners/${STORE}/hero-${ID}.webp`;
    expect(siteImagePathFromUrl(url, "hero")).toBe(`${STORE}/hero-${ID}.webp`);
    expect(siteImagePathFromUrl(url, "category")).toBeNull();
    expect(siteImagePathFromUrl("https://elsewhere.example/a.png", "hero")).toBeNull();
    expect(siteImagePathFromUrl(null, "hero")).toBeNull();
  });
});

describe("sanitizeBannerLink", () => {
  it("keeps site paths and https addresses", () => {
    expect(sanitizeBannerLink("/products?sale=1")).toBe("/products?sale=1");
    expect(sanitizeBannerLink("  /categories/mobiles ")).toBe("/categories/mobiles");
    expect(sanitizeBannerLink("https://example.com/offer")).toBe("https://example.com/offer");
  });

  it("drops anything that could run code or leave the site unexpectedly", () => {
    expect(sanitizeBannerLink("javascript:alert(1)")).toBeNull();
    expect(sanitizeBannerLink("data:text/html,x")).toBeNull();
    expect(sanitizeBannerLink("http://insecure.example")).toBeNull();
    expect(sanitizeBannerLink("//evil.example")).toBeNull();
    expect(sanitizeBannerLink("/\\evil.example")).toBeNull();
    expect(sanitizeBannerLink("")).toBeNull();
    expect(sanitizeBannerLink(null)).toBeNull();
  });
});
