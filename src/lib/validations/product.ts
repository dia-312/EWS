import { z } from "zod";
import { slugSchema } from "@/lib/slug";
import type { FormErrors } from "@/lib/validations/category";

export const AVAILABILITY = ["in_stock", "limited", "out_of_stock"] as const;
export type Availability = (typeof AVAILABILITY)[number];

const MAX_ALIASES = 20;
const MAX_SPECS = 40;

/** Empty form fields arrive as "" and are stored as null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

/**
 * "1,299.5" and "1299,5" both -> 1299.5, rounded to 2 decimals. A comma is a
 * thousands separator when the number also has a dot, otherwise a decimal comma.
 */
function parsePrice(value: string) {
  const compact = value.replace(/\s/g, "");
  return Number(compact.includes(".") ? compact.replace(/,/g, "") : compact.replace(",", "."));
}

/** A required price field: text from the form -> number >= 0 with 2 decimals. */
export const price = z
  .string()
  .trim()
  .min(1)
  .transform(parsePrice)
  .pipe(z.number().finite().min(0).max(9_999_999.99))
  .transform((value) => Math.round(value * 100) / 100);

const specSchema = z.object({
  spec_key: z.string().trim().min(1).max(60),
  value_ar: optionalText(300),
  value_en: optionalText(300),
});

export const productSchema = z.object({
  name_ar: z.string().trim().min(1).max(160),
  name_en: optionalText(160),
  slug: slugSchema,
  category_id: z.string().uuid(),
  brand_id: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .pipe(z.string().uuid().nullable()),
  new_brand: optionalText(80),
  price,
  availability: z.enum(AVAILABILITY),
  short_description_ar: optionalText(300),
  short_description_en: optionalText(300),
  description_ar: optionalText(5000),
  description_en: optionalText(5000),
  active: z.boolean(),
  featured: z.boolean(),
  bestseller_manual: z.boolean(),
  is_new_override: z
    .enum(["auto", "yes", "no"])
    .transform((value) => (value === "auto" ? null : value === "yes")),
  sort_order: z
    .string()
    .trim()
    .transform((value) => (value === "" ? 0 : Number(value)))
    .pipe(z.number().int().min(-9999).max(9999)),
  search_aliases: z
    .array(z.string().trim().min(1).max(60))
    .max(MAX_ALIASES),
  specs: z.array(specSchema).max(MAX_SPECS),
  badge_ids: z.array(z.string().uuid()).max(20),
});

export type ProductInput = z.infer<typeof productSchema>;

/** Aliases are typed one per line or separated by commas (Latin or Arabic). */
export function parseAliases(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(/[\n,،]/)) {
    const alias = part.trim();
    if (alias) seen.add(alias);
  }
  return [...seen];
}

/** Zips the repeated spec_* inputs into rows, dropping completely empty ones. */
export function parseSpecRows(formData: FormData) {
  const keys = formData.getAll("spec_key").map(String);
  const valuesAr = formData.getAll("spec_value_ar").map(String);
  const valuesEn = formData.getAll("spec_value_en").map(String);

  return keys
    .map((key, index) => ({
      spec_key: key.trim(),
      value_ar: valuesAr[index] ?? "",
      value_en: valuesEn[index] ?? "",
    }))
    .filter((row) => row.spec_key || row.value_ar.trim() || row.value_en.trim());
}

export function parseProductForm(formData: FormData) {
  const text = (name: string) => String(formData.get(name) ?? "");

  return productSchema.safeParse({
    name_ar: text("name_ar"),
    name_en: text("name_en"),
    slug: text("slug"),
    category_id: text("category_id"),
    brand_id: text("brand_id"),
    new_brand: text("new_brand"),
    price: text("price"),
    availability: text("availability"),
    short_description_ar: text("short_description_ar"),
    short_description_en: text("short_description_en"),
    description_ar: text("description_ar"),
    description_en: text("description_en"),
    active: formData.get("active") === "on",
    featured: formData.get("featured") === "on",
    bestseller_manual: formData.get("bestseller_manual") === "on",
    is_new_override: text("is_new_override") || "auto",
    sort_order: text("sort_order"),
    search_aliases: parseAliases(text("search_aliases")),
    specs: parseSpecRows(formData),
    badge_ids: formData.getAll("badge_ids").map(String),
  });
}

/** Maps zod issues to the error codes shown next to each field. */
export function toProductFieldErrors(error: z.ZodError): FormErrors {
  const errors: FormErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    if (errors[field]) continue;

    if (field === "specs") {
      errors.specs = "invalid_spec";
    } else if (field === "slug") {
      errors.slug = issue.code === "too_small" ? "required" : "invalid_slug";
    } else if (field === "price") {
      errors.price = issue.code === "too_small" && issue.minimum === 1 ? "required" : "invalid_price";
    } else if (issue.code === "too_small" || issue.code === "invalid_type") {
      errors[field] = "required";
    } else {
      errors[field] = "invalid";
    }
  }

  return errors;
}

/** Returns true when two spec rows share a key (keys must be unique per product). */
export function hasDuplicateSpecKeys(specs: Array<{ spec_key: string }>) {
  const keys = specs.map((spec) => spec.spec_key);
  return new Set(keys).size !== keys.length;
}
