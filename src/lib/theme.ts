import { resolveTheme, themeCssVars, type ResolvedTheme } from "@/config/theme";
import { getStorefront } from "@/lib/storefront-data";

/**
 * The store's resolved theme. Never throws: if the data cannot be read the site
 * keeps working with the default preset instead of failing to render.
 */
export async function getStoreTheme(): Promise<ResolvedTheme> {
  try {
    return (await getStorefront()).theme;
  } catch {
    return resolveTheme(null);
  }
}

export async function getStoreThemeStyle() {
  return themeCssVars(await getStoreTheme()) as React.CSSProperties;
}
