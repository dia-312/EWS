"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/admin", key: "dashboard", exact: true },
  { href: "/admin/products", key: "products", exact: false },
  { href: "/admin/categories", key: "categories", exact: false },
  { href: "/admin/offers", key: "offers", exact: false },
  { href: "/admin/appearance", key: "appearance", exact: false },
  { href: "/admin/settings", key: "settings", exact: false },
] as const;

export function AdminNav() {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")} className="border-b border-border bg-background">
      <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
        {ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-primary",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:text-foreground",
                )}
              >
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
