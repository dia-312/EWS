import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

const AVAILABILITY_STYLE: Record<string, string> = {
  in_stock: "bg-green-100 text-green-800",
  limited: "bg-amber-100 text-amber-900",
  out_of_stock: "bg-red-100 text-red-800",
};

/** Stock state with a text label (never color alone). */
export function AvailabilityBadge({
  availability,
  className,
}: {
  availability: string;
  className?: string;
}) {
  const t = useTranslations("store.availability");
  const known = availability in AVAILABILITY_STYLE;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        known ? AVAILABILITY_STYLE[availability] : "bg-surface text-muted",
        className,
      )}
    >
      {known ? t(availability as "in_stock") : availability}
    </span>
  );
}

/** Keys that are derived from data (offer, creation date) rather than curated. */
const DERIVED_BADGE_KEYS = new Set(["new", "sale"]);
const KNOWN_CURATED_KEYS = new Set(["featured", "best_seller", "limited"]);

type ProductBadgesProps = {
  discountPercent: number | null;
  onSale: boolean;
  isNew: boolean;
  badgeKeys: string[];
  className?: string;
};

/** SALE and NEW come from the data; the rest are the badges the owner assigned. */
export function ProductBadges({
  discountPercent,
  onSale,
  isNew,
  badgeKeys,
  className,
}: ProductBadgesProps) {
  const t = useTranslations("store.badges");
  const curated = badgeKeys.filter((key) => !DERIVED_BADGE_KEYS.has(key));

  if (!onSale && !isNew && curated.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap gap-1", className)}>
      {onSale && (
        <li className="rounded-full bg-danger px-2.5 py-0.5 text-xs font-bold text-white">
          {discountPercent ? `${t("sale")} ${discountPercent}%` : t("sale")}
        </li>
      )}
      {isNew && (
        <li className="rounded-full bg-green-700 px-2.5 py-0.5 text-xs font-bold text-white">
          {t("new")}
        </li>
      )}
      {curated.map((key) => (
        <li
          key={key}
          className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
        >
          {KNOWN_CURATED_KEYS.has(key) ? t(key as "featured") : key}
        </li>
      ))}
    </ul>
  );
}
