import { z } from "zod";
import { isProductSection, MAX_LIMIT, MIN_LIMIT } from "@/lib/homepage";
import type { FormErrors } from "@/lib/validations/category";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

export const sectionSchema = z.object({
  title_ar: optionalText(120),
  title_en: optionalText(120),
  subtitle_ar: optionalText(300),
  subtitle_en: optionalText(300),
});

export type SectionInput = z.infer<typeof sectionSchema> & { limit: number | null };

export type ParsedSection =
  | { success: true; data: SectionInput }
  | { success: false; errors: FormErrors };

/** Validates the section form; "limit" only applies to sections that list products. */
export function parseSectionForm(formData: FormData, type: string): ParsedSection {
  const text = (name: string) => String(formData.get(name) ?? "");
  const errors: FormErrors = {};

  const parsed = sectionSchema.safeParse({
    title_ar: text("title_ar"),
    title_en: text("title_en"),
    subtitle_ar: text("subtitle_ar"),
    subtitle_en: text("subtitle_en"),
  });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "form");
      if (!errors[field]) errors[field] = issue.code === "too_big" ? "too_long" : "invalid";
    }
  }

  let limit: number | null = null;
  if (isProductSection(type)) {
    const raw = text("limit").trim();
    const number = Number(raw);
    if (raw === "" || !Number.isInteger(number) || number < MIN_LIMIT || number > MAX_LIMIT) {
      errors.limit = "invalid_limit";
    } else {
      limit = number;
    }
  }

  if (!parsed.success || Object.keys(errors).length > 0) return { success: false, errors };
  return { success: true, data: { ...parsed.data, limit } };
}
