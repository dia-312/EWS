import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/storefront/breadcrumbs";

/** The title block at the top of listing-style pages: breadcrumbs, a big heading and a short line under it. */
export function PageHeader({
  crumbs,
  title,
  description,
  children,
}: {
  crumbs?: Crumb[];
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="relative isolate overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary-soft via-background to-background px-6 py-7 shadow-card sm:px-10 sm:py-9">
      <span aria-hidden className="absolute -end-16 -top-20 -z-10 size-64 rounded-full bg-primary opacity-15 blur-3xl" />
      {crumbs && <Breadcrumbs items={crumbs} />}
      <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-muted">{description}</p>}
      {children}
    </header>
  );
}
