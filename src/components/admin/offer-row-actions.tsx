"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  deleteOffer,
  toggleOfferActive,
} from "@/app/admin/(panel)/offers/actions";
import { Button, buttonClass } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function OfferRowActions({
  id,
  productName,
  active,
}: {
  id: string;
  productName: string;
  active: boolean;
}) {
  const t = useTranslations("admin.offers");
  const tc = useTranslations("admin.common");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Link href={`/admin/offers/${id}`} className={buttonClass("ghost", "sm")}>
        {tc("edit")}
      </Link>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => toggleOfferActive(id, !active))}
      >
        {active ? t("deactivate") : t("activate")}
      </Button>
      <ConfirmDialog
        triggerLabel={tc("delete")}
        title={t("deleteDialog.title")}
        description={t("deleteDialog.description", { name: productName })}
        confirmLabel={t("deleteDialog.confirm")}
        cancelLabel={tc("cancel")}
        onConfirm={async () => {
          const result = await deleteOffer(id);
          return result.error ? t(`deleteErrors.${result.error}`) : undefined;
        }}
      />
    </div>
  );
}
