"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormErrors } from "@/lib/validations/category";
import {
  checkContrast,
  parseAppearanceForm,
  toAppearanceFieldErrors,
  toStoredTheme,
} from "@/lib/validations/settings";

export type AppearanceFormState = {
  fieldErrors?: FormErrors;
  formError?: "save_failed";
  saved?: boolean;
};

export async function saveAppearance(
  _prev: AppearanceFormState,
  formData: FormData,
): Promise<AppearanceFormState> {
  const session = await requireEditor();

  const parsed = parseAppearanceForm(formData);
  if (!parsed.success) return { fieldErrors: toAppearanceFieldErrors(parsed.error) };

  const input = parsed.data;
  const contrastErrors = checkContrast(input.preset, {
    primary: input.primary_color,
    surface: input.surface_color,
    text: input.text_color,
  });
  if (Object.keys(contrastErrors).length > 0) return { fieldErrors: contrastErrors };

  const db = await createClient();
  const { error } = await db
    .from("store_theme")
    .upsert({ store_id: session.storeId, ...toStoredTheme(input) }, { onConflict: "store_id" });
  if (error) return { formError: "save_failed" };

  revalidatePath("/", "layout");
  return { saved: true };
}
