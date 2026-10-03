import { describe, expect, it } from "vitest";
import { parseSectionForm } from "./homepage";

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

describe("parseSectionForm", () => {
  it("turns empty texts into null", () => {
    const result = parseSectionForm(form({ title_ar: "", title_en: " New ", subtitle_ar: "", subtitle_en: "" }), "hero");
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toEqual({ title_ar: null, title_en: "New", subtitle_ar: null, subtitle_en: null, limit: null });
  });

  it("requires a valid number of products for product sections", () => {
    const ok = parseSectionForm(form({ limit: "6" }), "featured");
    expect(ok.success && ok.data.limit).toBe(6);

    for (const limit of ["", "abc", "1", "25", "3.5"]) {
      const result = parseSectionForm(form({ limit }), "featured");
      expect(result.success, limit).toBe(false);
      if (!result.success) expect(result.errors.limit).toBe("invalid_limit");
    }
  });

  it("ignores the limit for sections that do not list products", () => {
    const result = parseSectionForm(form({ limit: "abc" }), "hero");
    expect(result.success && result.data.limit).toBe(null);
  });

  it("rejects over-long texts", () => {
    const result = parseSectionForm(form({ title_ar: "x".repeat(121) }), "hero");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.title_ar).toBe("too_long");
  });
});
