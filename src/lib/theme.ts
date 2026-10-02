import { cache } from "react";
import { resolveTheme, themeCssVars, type ResolvedTheme } from "@/config/theme";
import { getCurrentStore } from "@/lib/store";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * The store's resolved theme. Never throws: if the row cannot be read the site
 * keeps working with the default preset instead of failing to render.
 */
export const getStoreTheme = cache(async (): Promise<ResolvedTheme> => {
  try {
    const store = await getCurrentStore();
    const { data } = await createPublicClient()
      .from("store_theme")
      .select("preset, primary_color, secondary_color, accent_color, surface_color, text_color, font_key, radius")
      .eq("store_id", store.id)
      .maybeSingle();
    return resolveTheme(data);
  } catch {
    return resolveTheme(null);
  }
});

export async function getStoreThemeStyle() {
  return themeCssVars(await getStoreTheme()) as React.CSSProperties;
}
