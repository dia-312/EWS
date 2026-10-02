import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales } from "@/config/i18n";

/** Public pages live under /ar and /en. The admin area has no locale prefix. */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
});
