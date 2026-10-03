"use client";

import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** What a visitor sees when a page cannot be loaded (for example when the database is unreachable). */
export default function StorefrontError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("store.states");
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-background p-8 text-center" data-error-state>
      <h1 className="text-2xl font-bold">{t("errorTitle")}</h1>
      <p className="text-muted">{t("errorBody")}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className={buttonClass("primary")}>
          {t("retry")}
        </button>
        <Link href="/" className={buttonClass("secondary")}>
          {t("home")}
        </Link>
      </div>
    </div>
  );
}
