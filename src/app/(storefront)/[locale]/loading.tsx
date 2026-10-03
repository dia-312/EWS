import { getTranslations } from "next-intl/server";

/** Shown while a page's data is on its way (the database can be far from the visitor). */
export default async function StorefrontLoading() {
  const t = await getTranslations("store.states");
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6" data-loading>
      <span className="sr-only">{t("loading")}</span>
      <div className="h-8 w-48 animate-pulse rounded-lg bg-border motion-reduce:animate-none" />
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4" aria-hidden>
        {Array.from({ length: 8 }, (_, index) => (
          <li key={index} className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-3">
            <div className="aspect-square animate-pulse rounded-xl bg-surface motion-reduce:animate-none" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-surface motion-reduce:animate-none" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-surface motion-reduce:animate-none" />
          </li>
        ))}
      </ul>
    </div>
  );
}
