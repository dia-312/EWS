"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormErrors } from "@/lib/validations/category";
import {
  parseSettingsForm,
  parseWorkingHoursForm,
  toSettingsFieldErrors,
} from "@/lib/validations/settings";

export type SettingsFormState = {
  fieldErrors?: FormErrors;
  formError?: "save_failed";
  saved?: boolean;
};

export async function saveSettings(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const session = await requireEditor();

  const parsed = parseSettingsForm(formData);
  const { hours, valid: hoursValid } = parseWorkingHoursForm(formData);

  const fieldErrors: FormErrors = parsed.success ? {} : toSettingsFieldErrors(parsed.error);
  if (!hoursValid) fieldErrors.working_hours = "invalid_hours";
  if (!parsed.success || !hoursValid) return { fieldErrors };

  const input = parsed.data;
  const db = await createClient();

  const store = await db
    .from("stores")
    .update({
      name: input.name,
      currency_code: input.currency_code,
      locale_default: input.locale_default,
      timezone: input.timezone,
    })
    .eq("id", session.storeId);
  if (store.error) return { formError: "save_failed" };

  const settings = await db.from("store_settings").upsert(
    {
      store_id: session.storeId,
      phone: input.phone,
      whatsapp: input.whatsapp,
      instagram_url: input.instagram_url,
      facebook_url: input.facebook_url,
      map_url: input.map_url,
      address_ar: input.address_ar,
      address_en: input.address_en,
      about_text_ar: input.about_text_ar,
      about_text_en: input.about_text_en,
      seo_title: input.seo_title,
      seo_description: input.seo_description,
      working_hours: hours,
    },
    { onConflict: "store_id" },
  );
  if (settings.error) return { formError: "save_failed" };

  revalidatePath("/", "layout");
  return { saved: true };
}
