import { z } from "zod";
import { slugSchema } from "@/lib/slug";

/** Empty form fields arrive as "" and are stored as null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

export const categorySchema = z.object({
  name_ar: z.string().trim().min(1).max(120),
  name_en: optionalText(120),
  slug: slugSchema,
  description_ar: optionalText(500),
  description_en: optionalText(500),
  icon: optionalText(40),
  active: z.boolean(),
});

export type CategoryInput = z.infer<typeof categorySchema>;

/** Field-level error codes returned to the form (translated in the UI). */
export type FormErrors = Partial<Record<string, string>>;

export function parseCategoryForm(formData: FormData) {
  return categorySchema.safeParse({
    name_ar: formData.get("name_ar") ?? "",
    name_en: formData.get("name_en") ?? "",
    slug: formData.get("slug") ?? "",
    description_ar: formData.get("description_ar") ?? "",
    description_en: formData.get("description_en") ?? "",
    icon: formData.get("icon") ?? "",
    active: formData.get("active") === "on",
  });
}

export function toFieldErrors(error: z.ZodError): FormErrors {
  const errors: FormErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    if (errors[field]) continue;
    errors[field] =
      issue.code === "too_small" || issue.code === "invalid_type"
        ? "required"
        : field === "slug"
          ? "invalid_slug"
          : "invalid";
  }
  return errors;
}
