"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";

/**
 * Entry point of the planned AI shopping assistant. It is intentionally a
 * "coming soon" notice only: no request is made and no answer is faked.
 */
export function AiAssistantEntry() {
  const t = useTranslations("store.ai");
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label={t("entry")}
        className="fixed bottom-4 end-4 z-40 flex items-center gap-2 rounded-full bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground shadow-lift ring-1 ring-white/10 transition-transform hover:scale-[1.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span aria-hidden>✦</span>
        <span className="hidden sm:inline">{t("entry")}</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="ai-title"
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-3xl border border-border bg-background p-7 text-foreground shadow-lift backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <div className="flex flex-col items-start gap-3">
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
            {t("badge")}
          </span>
          <h2 id="ai-title" className="text-xl font-bold">
            {t("title")}
          </h2>
          <p className="text-sm text-muted">{t("description")}</p>
          <ul className="list-disc ps-5 text-sm text-muted">
            <li>{t("point1")}</li>
            <li>{t("point2")}</li>
          </ul>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="mt-2 self-end rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {t("close")}
          </button>
        </div>
      </dialog>
    </>
  );
}
