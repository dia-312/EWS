import { z } from "zod";
import { zonedTimeToUtc } from "@/lib/timezone";
import type { FormErrors } from "@/lib/validations/category";
import { price } from "@/lib/validations/product";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

/** An optional price: empty -> null, otherwise validated like any price. */
const optionalPrice = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .pipe(z.union([z.null(), price]));

export const offerSchema = z.object({
  product_id: z.string().uuid(),
  title_ar: optionalText(120),
  title_en: optionalText(120),
  old_price: optionalPrice,
  new_price: price,
  active: z.boolean(),
});

export type OfferInput = z.infer<typeof offerSchema> & {
  start_at: string | null;
  end_at: string | null;
};

export type ParsedOffer =
  | { success: true; data: OfferInput }
  | { success: false; errors: FormErrors };

/** Reads a datetime-local value as the store's wall-clock time; "" means "not set". */
function parseWindowEdge(raw: string, timeZone: string): { value: string | null; valid: boolean } {
  const text = raw.trim();
  if (!text) return { value: null, valid: true };
  const utc = zonedTimeToUtc(text, timeZone);
  return utc ? { value: utc.toISOString(), valid: true } : { value: null, valid: false };
}

/** Field-level checks that do not need the product (those happen in the action). */
export function parseOfferForm(formData: FormData, timeZone: string): ParsedOffer {
  const text = (name: string) => String(formData.get(name) ?? "");
  const errors: FormErrors = {};

  const parsed = offerSchema.safeParse({
    product_id: text("product_id"),
    title_ar: text("title_ar"),
    title_en: text("title_en"),
    old_price: text("old_price"),
    new_price: text("new_price"),
    active: formData.get("active") === "on",
  });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "form");
      if (errors[field]) continue;
      errors[field] =
        field === "product_id"
          ? "product_required"
          : field === "new_price" && issue.code === "too_small" && issue.minimum === 1
            ? "required"
            : field === "new_price" || field === "old_price"
              ? "invalid_price"
              : "invalid";
    }
  }

  const start = parseWindowEdge(text("start_at"), timeZone);
  const end = parseWindowEdge(text("end_at"), timeZone);
  if (!start.valid) errors.start_at = "invalid_date";
  if (!end.valid) errors.end_at = "invalid_date";
  if (start.value && end.value && new Date(end.value) <= new Date(start.value)) {
    errors.end_at = "end_before_start";
  }

  if (!parsed.success || Object.keys(errors).length > 0) return { success: false, errors };
  return { success: true, data: { ...parsed.data, start_at: start.value, end_at: end.value } };
}
