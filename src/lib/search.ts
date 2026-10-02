/**
 * Normalizes text for Arabic/English search. This must stay in sync with the
 * SQL function public.normalize_search(), which builds products.search_text:
 *  - alef forms to bare alef, alef maqsura to ya, ta marbuta to ha
 *  - tashkeel (diacritics) and tatweel removed
 *  - lowercase, Latin accents removed, whitespace collapsed
 */
export function normalizeSearch(input: string): string {
  return input
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ً-ْٰـ]/g, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Escapes LIKE wildcards so user input is matched literally. */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (char) => `\\${char}`);
}
