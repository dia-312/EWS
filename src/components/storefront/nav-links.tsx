"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export type NavItem = { href: string; label: string; match?: "exact" | "prefix" };

/** The row of page links under the header. The page you are on is highlighted. */
export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
        const path = item.href.split("?")[0];
        // "All products" and "Offers" share /products, so only the plain link counts as current there
        const active = item.href.includes("?")
          ? false
          : item.match === "exact"
            ? pathname === path
            : pathname === path || pathname.startsWith(`${path}/`);
        return (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "block whitespace-nowrap rounded-full px-3.5 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                active ? "bg-primary-soft font-semibold text-foreground" : "text-muted hover:bg-surface hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
