import { afterEach, describe, expect, it, vi } from "vitest";
import { absoluteUrl, currentPrice, isNewProduct, siteUrl } from "./storefront";

describe("isNewProduct", () => {
  const now = new Date("2026-10-30T00:00:00Z");

  it("is new for 30 days after creation", () => {
    expect(isNewProduct("2026-10-10T00:00:00Z", null, now)).toBe(true);
    expect(isNewProduct("2026-09-01T00:00:00Z", null, now)).toBe(false);
  });

  it("lets the owner force or remove the badge", () => {
    expect(isNewProduct("2020-01-01T00:00:00Z", true, now)).toBe(true);
    expect(isNewProduct("2026-10-29T00:00:00Z", false, now)).toBe(false);
  });
});

describe("currentPrice", () => {
  it("returns the regular price when there is no offer", () => {
    expect(currentPrice({ price: 100, offerPrice: null, offerOldPrice: null })).toEqual({
      current: 100,
      was: null,
      discountPercent: null,
    });
  });

  it("shows the offer price, the old price and the discount", () => {
    expect(currentPrice({ price: 1350, offerPrice: 1150, offerOldPrice: 1350 })).toEqual({
      current: 1150,
      was: 1350,
      discountPercent: 15,
    });
  });

  it("falls back to the product price when the offer has no old price", () => {
    expect(currentPrice({ price: 200, offerPrice: 150, offerOldPrice: null })).toMatchObject({
      current: 150,
      was: 200,
      discountPercent: 25,
    });
  });

  it("does not claim a discount when the offer is not cheaper", () => {
    expect(currentPrice({ price: 100, offerPrice: 100, offerOldPrice: 100 })).toEqual({
      current: 100,
      was: null,
      discountPercent: null,
    });
  });
});

describe("siteUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("trims trailing slashes and builds locale urls", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shop.example.com//");
    expect(siteUrl()).toBe("https://shop.example.com");
    expect(absoluteUrl("ar", "/products/x")).toBe("https://shop.example.com/ar/products/x");
  });
});
