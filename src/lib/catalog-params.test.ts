import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  parseCatalogParams,
  toQueryString,
  totalPages,
} from "./catalog-params";

describe("parseCatalogParams", () => {
  it("returns defaults for an empty query", () => {
    expect(parseCatalogParams({})).toEqual({
      q: "",
      category: "",
      brands: [],
      min: null,
      max: null,
      availability: [],
      onSale: false,
      sort: "newest",
      page: 1,
    });
  });

  it("reads valid values and trims the search text", () => {
    const params = parseCatalogParams({
      q: "  iphone ",
      category: "mobiles",
      brand: ["apple", "samsung"],
      min: "100",
      max: "2000.5",
      availability: ["in_stock", "limited"],
      sale: "1",
      sort: "price_asc",
      page: "3",
    });
    expect(params).toMatchObject({
      q: "iphone",
      category: "mobiles",
      brands: ["apple", "samsung"],
      min: 100,
      max: 2000.5,
      availability: ["in_stock", "limited"],
      onSale: true,
      sort: "price_asc",
      page: 3,
    });
  });

  it("accepts comma separated lists", () => {
    expect(parseCatalogParams({ brand: "apple,samsung", availability: "in_stock,limited" })).toMatchObject({
      brands: ["apple", "samsung"],
      availability: ["in_stock", "limited"],
    });
  });

  it("ignores invalid values instead of failing", () => {
    const params = parseCatalogParams({
      sort: "random; drop table",
      availability: ["sold_out", "in_stock"],
      min: "abc",
      max: "-5",
      page: "-2",
      sale: "yes",
    });
    expect(params.sort).toBe("newest");
    expect(params.availability).toEqual(["in_stock"]);
    expect(params.min).toBeNull();
    expect(params.max).toBeNull();
    expect(params.page).toBe(1);
    expect(params.onSale).toBe(false);
  });

  it("swaps a reversed price range and caps absurd page numbers", () => {
    const params = parseCatalogParams({ min: "500", max: "100", page: "99999" });
    expect([params.min, params.max]).toEqual([100, 500]);
    expect(params.page).toBe(500);
  });
});

describe("toQueryString", () => {
  it("leaves defaults out", () => {
    expect(toQueryString(parseCatalogParams({}))).toBe("");
    expect(toQueryString({ sort: "newest", page: 1 })).toBe("");
  });

  it("round-trips a full state", () => {
    const original = parseCatalogParams({
      q: "سماعه",
      category: "accessories-headphones",
      brand: ["jbl", "sony"],
      min: "50",
      availability: "limited",
      sale: "1",
      sort: "name",
      page: "2",
    });
    const reparsed = parseCatalogParams(Object.fromEntries(new URLSearchParams(toQueryString(original)).entries()));
    expect(reparsed.q).toBe("سماعه");
    expect(reparsed.category).toBe(original.category);
    expect(reparsed.min).toBe(50);
    expect(reparsed.availability).toEqual(["limited"]);
    expect(reparsed.onSale).toBe(true);
    expect(reparsed.sort).toBe("name");
    expect(reparsed.page).toBe(2);
    // repeated keys are kept as repeated keys
    expect(toQueryString(original)).toContain("brand=jbl&brand=sony");
  });
});

describe("activeFilterCount and totalPages", () => {
  it("counts filters but not sorting or paging", () => {
    expect(activeFilterCount(parseCatalogParams({ sort: "name", page: "4" }))).toBe(0);
    expect(
      activeFilterCount(parseCatalogParams({ q: "a", category: "x", brand: "a,b", min: "1", sale: "1" })),
    ).toBe(6);
  });

  it("computes at least one page", () => {
    expect(totalPages(0)).toBe(1);
    expect(totalPages(24)).toBe(1);
    expect(totalPages(25)).toBe(2);
  });
});
