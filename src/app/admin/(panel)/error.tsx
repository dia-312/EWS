"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("admin.states");
  return (
    <div role="alert" className="flex max-w-lg flex-col items-start gap-3 rounded-2xl border border-danger bg-background p-6" data-error-state>
      <h1 className="text-xl font-bold">{t("errorTitle")}</h1>
      <p className="text-muted">{t("errorBody")}</p>
      <Button onClick={reset}>{t("retry")}</Button>
    </div>
  );
}
