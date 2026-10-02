import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";

type PriceProps = {
  current: number;
  was: number | null;
  currency: string;
  locale: string;
  size?: "md" | "lg";
  className?: string;
};

/** Current price, with the old price struck through when an offer applies. */
export function Price({ current, was, currency, locale, size = "md", className }: PriceProps) {
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2", className)} dir="ltr">
      <span className={cn("font-bold", size === "lg" ? "text-3xl" : "text-lg")}>
        {formatPrice(current, currency, locale)}
      </span>
      {was !== null && (
        <del className={cn("text-muted", size === "lg" ? "text-lg" : "text-sm")}>
          {formatPrice(was, currency, locale)}
        </del>
      )}
    </div>
  );
}
