import { cn } from "@/lib/cn";

const STAR = "M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.5l-5.9 3.2 1.2-6.6L2.5 9.5l6.6-.9z";

/** Five stars, filled up to `value` (halves are rounded to the nearest half star). Decorative: the number is shown next to it. */
export function Stars({ value, className }: { value: number; className?: string }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span aria-hidden className={cn("inline-flex gap-0.5 text-accent", className)}>
      {[1, 2, 3, 4, 5].map((position) => {
        const fill = rounded >= position ? 1 : rounded >= position - 0.5 ? 0.5 : 0;
        return (
          <svg key={position} viewBox="0 0 24 24" className="size-4">
            <defs>
              <linearGradient id={`half-${position}-${fill}`}>
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <path
              d={STAR}
              fill={fill === 1 ? "currentColor" : fill === 0.5 ? `url(#half-${position}-${fill})` : "none"}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </span>
  );
}
