import type { MetadataRoute } from "next";
import { defaultLocale, getDirection } from "@/config/i18n";
import { pickLocalized } from "@/lib/format";
import { getStorefront } from "@/lib/storefront-data";

export const dynamic = "force-dynamic";

/** The install-to-home-screen details, taken from the store's own settings and theme. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { store, settings, theme } = await getStorefront();
  const lang = defaultLocale;
  const description =
    settings?.seo_description || pickLocalized(lang, settings?.about_text_ar, settings?.about_text_en) || undefined;

  return {
    name: store.name,
    short_name: store.name.length > 12 ? store.name.slice(0, 12).trim() : store.name,
    description,
    id: `/${lang}`,
    start_url: `/${lang}`,
    scope: "/",
    display: "standalone",
    lang,
    dir: getDirection(lang),
    background_color: theme.colors.surface,
    theme_color: theme.colors.primary,
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
