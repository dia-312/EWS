"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/** Mobile "Filters" sheet: a modal <dialog> that holds the filter form. */
export function FilterDrawer({ activeCount, children }: { activeCount: number; children: React.ReactNode }) {
  const t = useTranslations("store.filters");
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button variant="secondary" className="rounded-pill px-5" onClick={() => dialogRef.current?.showModal()} aria-haspopup="dialog">
        {t("title")}
        {activeCount > 0 && (
          <span className="rounded-pill bg-primary px-2 text-xs text-primary-foreground">{activeCount}</span>
        )}
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby="filters-title"
        className="m-0 ms-auto h-full max-h-none w-[min(22rem,100%)] overflow-y-auto border-s border-border bg-background p-6 text-foreground shadow-lift backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="filters-title" className="section-title text-lg">
            {t("title")}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => dialogRef.current?.close()}>
            {t("close")}
          </Button>
        </div>
        {children}
      </dialog>
    </>
  );
}
