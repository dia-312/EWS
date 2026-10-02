import { describe, expect, it } from "vitest";
import { slugify, slugSchema } from "./slug";

describe("slugify", () => {
  it("builds a kebab-case slug from a latin name", () => {
    expect(slugify("Mobile Phones")).toBe("mobile-phones");
    expect(slugify("  Samsung Galaxy A55 (256GB)! ")).toBe("samsung-galaxy-a55-256gb");
  });

  it("returns an empty string when there is nothing latin to use", () => {
    expect(slugify("موبايلات")).toBe("");
  });
});

describe("slugSchema", () => {
  it("accepts valid slugs", () => {
    expect(slugSchema.safeParse("mobile-phones").success).toBe(true);
    expect(slugSchema.safeParse("a55").success).toBe(true);
  });

  it("rejects spaces, uppercase, slashes and leading dashes", () => {
    for (const bad of ["Mobile", "mobile phones", "a/b", "-a", "a--b", ""]) {
      expect(slugSchema.safeParse(bad).success).toBe(false);
    }
  });
});
