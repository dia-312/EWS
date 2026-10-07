import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { SORT_KEYS, toQueryString, type CatalogParams } from "@/lib/catalog-params";

/** Sort options as plain links, so they work without JavaScript. */
export function SortLinks({ basePath, params }: { basePath: string; params: CatalogParams }) {
  const t = useTranslations("store.sort");

  return (
    <nav aria-label={t("label")} className="flex flex-wrap items-center gap-1.5 text-sm">
      <span className="text-muted">{t("label")}:</span>
      {SORT_KEYS.map((key) => {
        const active = params.sort === key;
        return (
          <Link
            key={key}
            href={`${basePath}${toQueryString({ ...params, sort: key, page: 1 })}`}
            aria-current={active ? "true" : undefined}
            className={cn(
              "rounded-full px-3.5 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-primary",
              active ? "bg-primary font-semibold text-primary-foreground shadow-glow" : "border border-border bg-background hover:border-primary hover:bg-primary-soft",
            )}
          >
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
