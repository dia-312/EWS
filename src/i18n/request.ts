import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale } from "@/config/i18n";

// Locale resolution without URL prefixes (used by the admin area and as the
// fallback for the whole app). The public storefront will add /ar and /en
// routes on top of this.
export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
