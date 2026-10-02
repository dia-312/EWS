import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export type Crumb = { label: string; href?: string };

/** Breadcrumb trail; the last item is the current page and is not a link. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = useTranslations("store.nav");

  return (
    <nav aria-label={t("breadcrumbs")} className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {item.href && !last ? (
                <Link href={item.href} className="underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "text-foreground" : undefined}>
                  {item.label}
                </span>
              )}
              {!last && (
                <span aria-hidden className="rtl:-scale-x-100">
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
