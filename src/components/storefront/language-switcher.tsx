"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { locales, type Locale } from "@/config/i18n";
import { Link, usePathname } from "@/i18n/navigation";

/** Switches to the other language while keeping the current page and filters. */
export function LanguageSwitcher() {
  const t = useTranslations("store.language");
  const current = useLocale() as Locale;
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const other = locales.find((locale) => locale !== current) ?? current;
  const query = searchParams.toString();

  return (
    <Link
      href={`${pathname}${query ? `?${query}` : ""}`}
      locale={other}
      hrefLang={other}
      lang={other}
      className="inline-flex h-10 items-center rounded-full border border-border bg-background px-4 text-sm font-medium transition-colors hover:border-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-primary"
      aria-label={t("switchTo", { language: t(other) })}
    >
      {t(other)}
    </Link>
  );
}
