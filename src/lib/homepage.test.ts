import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIMIT,
  isProductSection,
  missingSectionTypes,
  moveId,
  readLimit,
} from "./homepage";

describe("readLimit", () => {
  it("reads a valid limit and falls back to the default otherwise", () => {
    expect(readLimit({ limit: 4 })).toBe(4);
    expect(readLimit({ limit: 12.9 })).toBe(12);
    for (const bad of [null, undefined, {}, { limit: "4" }, { limit: 0 }, { limit: 1 }, { limit: 99 }, { limit: NaN }, "x"]) {
      expect(readLimit(bad), JSON.stringify(bad)).toBe(DEFAULT_LIMIT);
    }
  });
});

describe("isProductSection", () => {
  it("is true only for sections that list products", () => {
    expect(isProductSection("featured")).toBe(true);
    expect(isProductSection("offers")).toBe(true);
    expect(isProductSection("hero")).toBe(false);
    expect(isProductSection("contact")).toBe(false);
  });
});

describe("missingSectionTypes", () => {
  it("lists addable types the store does not have, never the banner", () => {
    const missing = missingSectionTypes(["hero", "categories", "offers"]);
    expect(missing).not.toContain("hero");
    expect(missing).not.toContain("banner");
    expect(missing).toEqual(
      expect.arrayContaining(["new_arrivals", "best_sellers", "featured", "deal_of_day", "trust", "contact"]),
    );
  });

  it("is empty when everything is present", () => {
    expect(
      missingSectionTypes(["hero", "categories", "offers", "new_arrivals", "best_sellers", "featured", "deal_of_day", "trust", "contact"]),
    ).toEqual([]);
  });
});

describe("moveId", () => {
  const ids = ["a", "b", "c", "d"];

  it("swaps with the neighbour", () => {
    expect(moveId(ids, "b", "up")).toEqual(["b", "a", "c", "d"]);
    expect(moveId(ids, "b", "down")).toEqual(["a", "c", "b", "d"]);
  });

  it("does nothing at the edges or for unknown ids, and never mutates the input", () => {
    expect(moveId(ids, "a", "up")).toEqual(ids);
    expect(moveId(ids, "d", "down")).toEqual(ids);
    expect(moveId(ids, "zzz", "up")).toEqual(ids);
    expect(ids).toEqual(["a", "b", "c", "d"]);
  });
});
