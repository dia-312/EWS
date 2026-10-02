import { describe, expect, it } from "vitest";
import { parseOfferForm } from "./offer";

const PRODUCT = "11111111-1111-4111-8111-111111111111";
const TZ = "Asia/Hebron";

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

const valid = { product_id: PRODUCT, new_price: "1,150.5" };

describe("parseOfferForm", () => {
  it("accepts the minimum: a product and a new price", () => {
    const result = parseOfferForm(form({ ...valid, active: "on" }), TZ);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toMatchObject({
      product_id: PRODUCT,
      new_price: 1150.5,
      old_price: null,
      title_ar: null,
      start_at: null,
      end_at: null,
      active: true,
    });
  });

  it("reads the window as the store's wall-clock time and returns UTC", () => {
    const result = parseOfferForm(
      form({ ...valid, start_at: "2026-07-15T10:00", end_at: "2026-07-20T23:59" }),
      TZ,
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.start_at).toBe("2026-07-15T07:00:00.000Z");
    expect(result.data.end_at).toBe("2026-07-20T20:59:00.000Z");
  });

  it("flags a missing product, bad prices and bad dates", () => {
    const result = parseOfferForm(
      form({ product_id: "", new_price: "abc", old_price: "-5", start_at: "tomorrow" }),
      TZ,
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors).toMatchObject({
      product_id: "product_required",
      new_price: "invalid_price",
      old_price: "invalid_price",
      start_at: "invalid_date",
    });
  });

  it("requires a price", () => {
    const result = parseOfferForm(form({ product_id: PRODUCT, new_price: "" }), TZ);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.new_price).toBe("required");
  });

  it("requires the end to be after the start", () => {
    const result = parseOfferForm(
      form({ ...valid, start_at: "2026-07-20T10:00", end_at: "2026-07-20T10:00" }),
      TZ,
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.end_at).toBe("end_before_start");
  });
});
