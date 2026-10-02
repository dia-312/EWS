import { describe, expect, it } from "vitest";
import {
  hasDuplicateSpecKeys,
  parseAliases,
  parseProductForm,
  toProductFieldErrors,
} from "./product";

const CATEGORY = "11111111-1111-4111-8111-111111111111";

function form(entries: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      data.append(key, item);
    }
  }
  return data;
}

const valid = {
  name_ar: "هاتف",
  slug: "phone",
  category_id: CATEGORY,
  price: "1,299.5",
  availability: "in_stock",
};

describe("parseProductForm", () => {
  it("parses a minimal valid product and normalizes values", () => {
    const result = parseProductForm(form({ ...valid, active: "on" }));
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.price).toBe(1299.5);
    expect(result.data.name_en).toBeNull();
    expect(result.data.brand_id).toBeNull();
    expect(result.data.is_new_override).toBeNull();
    expect(result.data.sort_order).toBe(0);
    expect(result.data.active).toBe(true);
    expect(result.data.featured).toBe(false);
  });

  it("rejects a negative or non-numeric price", () => {
    for (const price of ["-1", "abc", ""]) {
      const result = parseProductForm(form({ ...valid, price }));
      expect(result.success).toBe(false);
    }
  });

  it("maps the new-badge override choice", () => {
    const yes = parseProductForm(form({ ...valid, is_new_override: "yes" }));
    const no = parseProductForm(form({ ...valid, is_new_override: "no" }));
    expect(yes.success && yes.data.is_new_override).toBe(true);
    expect(no.success && no.data.is_new_override).toBe(false);
  });

  it("zips spec rows and drops empty ones", () => {
    const result = parseProductForm(
      form({
        ...valid,
        spec_key: ["ram", "", "storage"],
        spec_value_ar: ["8 جيجا", "", ""],
        spec_value_en: ["8 GB", "", "256 GB"],
      }),
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.specs).toEqual([
      { spec_key: "ram", value_ar: "8 جيجا", value_en: "8 GB" },
      { spec_key: "storage", value_ar: null, value_en: "256 GB" },
    ]);
  });

  it("reports field errors with stable codes", () => {
    const result = parseProductForm(
      form({ ...valid, name_ar: "", slug: "Bad Slug", price: "-5" }),
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = toProductFieldErrors(result.error);
    expect(errors.name_ar).toBe("required");
    expect(errors.slug).toBe("invalid_slug");
    expect(errors.price).toBe("invalid_price");
  });
});

describe("parseAliases", () => {
  it("splits on newlines and Latin/Arabic commas, trims and de-duplicates", () => {
    expect(parseAliases("ايفون، iphone\n  ابل ,iphone")).toEqual([
      "ايفون",
      "iphone",
      "ابل",
    ]);
  });
});

describe("hasDuplicateSpecKeys", () => {
  it("detects repeated keys", () => {
    expect(hasDuplicateSpecKeys([{ spec_key: "ram" }, { spec_key: "ram" }])).toBe(true);
    expect(hasDuplicateSpecKeys([{ spec_key: "ram" }, { spec_key: "storage" }])).toBe(false);
  });
});
