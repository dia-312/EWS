/** Latin digits in both languages (the store prefers 0-9 over Arabic-Indic). */
function latinDigits(locale: string) {
  return `${locale}-u-nu-latn`;
}

export function formatPrice(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(latinDigits(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(value: string | Date, locale: string) {
  return new Intl.DateTimeFormat(latinDigits(locale), {
    dateStyle: "medium",
  }).format(new Date(value));
}

/** Picks the Arabic or English variant of bilingual content, falling back to Arabic. */
export function pickLocalized(
  locale: string,
  ar: string | null | undefined,
  en: string | null | undefined,
) {
  return (locale === "en" ? en || ar : ar || en) ?? "";
}

/** Date and time in the store's own time zone (used for offer windows). */
export function formatDateTime(value: string | Date, locale: string, timeZone: string) {
  return new Intl.DateTimeFormat(latinDigits(locale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}
