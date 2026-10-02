import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

type PaginationProps = {
  page: number;
  totalPages: number;
  /** Builds the link for a page, keeping the other filters. */
  hrefFor: (page: number) => string;
};

/** Previous / numbered / next links; works without JavaScript. */
export function Pagination({ page, totalPages, hrefFor }: PaginationProps) {
  const t = useTranslations("store.pagination");
  if (totalPages <= 1) return null;

  // Window of page numbers around the current one, plus the first and last.
  const numbers = new Set([1, totalPages, page - 1, page, page + 1]);
  const visible = [...numbers].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);

  return (
    <nav aria-label={t("label")} className="flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={buttonClass("secondary", "sm")}>
          {t("previous")}
        </Link>
      ) : null}

      <ul className="flex items-center gap-1">
        {visible.map((n, index) => (
          <li key={n} className="flex items-center gap-1">
            {index > 0 && n - visible[index - 1] > 1 && <span aria-hidden>…</span>}
            <Link
              href={hrefFor(n)}
              aria-current={n === page ? "page" : undefined}
              aria-label={t("goTo", { page: n })}
              className={cn(
                "inline-flex min-w-9 items-center justify-center rounded-lg px-2.5 py-1.5 text-sm",
                "focus-visible:outline-2 focus-visible:outline-primary",
                n === page ? "bg-primary font-bold text-primary-foreground" : "border border-border hover:bg-surface",
              )}
            >
              {n}
            </Link>
          </li>
        ))}
      </ul>

      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} rel="next" className={buttonClass("secondary", "sm")}>
          {t("next")}
        </Link>
      ) : null}
    </nav>
  );
}
