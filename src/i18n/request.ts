import { cookies } from "next/headers";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, locales } from "@/config/i18n";

/**
 * Public pages get their locale from the URL (/ar, /en), which the pages hand
 * over with setRequestLocale(). The admin area has no prefix, so it falls back
 * to the NEXT_LOCALE cookie and then to the default language.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const fromUrl = await requestLocale;

  let locale = defaultLocale;
  if (hasLocale(locales, fromUrl)) {
    locale = fromUrl;
  } else {
    const fromCookie = (await cookies()).get("NEXT_LOCALE")?.value;
    if (isLocale(fromCookie)) locale = fromCookie;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
