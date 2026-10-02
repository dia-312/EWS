import { useTranslations } from "next-intl";

/**
 * Plain GET form to the product listing: it works without JavaScript and the
 * search text ends up in the URL (?q=...), so results can be shared.
 */
export function SearchForm({ locale, defaultValue = "" }: { locale: string; defaultValue?: string }) {
  const t = useTranslations("store.search");

  return (
    <form role="search" action={`/${locale}/products`} method="get" className="flex w-full">
      <label htmlFor="site-search" className="sr-only">
        {t("label")}
      </label>
      <input
        id="site-search"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={t("placeholder")}
        autoComplete="off"
        maxLength={100}
        className="min-w-0 flex-1 rounded-s-lg border border-e-0 border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />
      <button
        type="submit"
        className="rounded-e-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {t("submit")}
      </button>
    </form>
  );
}
