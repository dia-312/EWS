import { useTranslations } from "next-intl";

/**
 * Plain GET form to the product listing: it works without JavaScript and the
 * search text ends up in the URL (?q=...), so results can be shared.
 */
export function SearchForm({ locale, defaultValue = "" }: { locale: string; defaultValue?: string }) {
  const t = useTranslations("store.search");

  return (
    <form
      role="search"
      action={`/${locale}/products`}
      method="get"
      className="group flex w-full items-center gap-1 rounded-pill border border-border bg-surface p-1 transition-shadow focus-within:border-primary focus-within:bg-background focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_16%,transparent)]"
    >
      <label htmlFor="site-search" className="sr-only">
        {t("label")}
      </label>
      <svg viewBox="0 0 24 24" aria-hidden className="ms-3 size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        id="site-search"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={t("placeholder")}
        autoComplete="off"
        maxLength={100}
        className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted"
      />
      <button
        type="submit"
        className="rounded-pill bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-[opacity,box-shadow] hover:opacity-90 hover:shadow-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {t("submit")}
      </button>
    </form>
  );
}
