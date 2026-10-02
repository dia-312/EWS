"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  deleteProduct,
  duplicateProduct,
  toggleProductActive,
} from "@/app/admin/(panel)/products/actions";
import { Button, buttonClass } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type ProductRowActionsProps = {
  id: string;
  name: string;
  active: boolean;
};

export function ProductRowActions({ id, name, active }: ProductRowActionsProps) {
  const t = useTranslations("admin.products");
  const tc = useTranslations("admin.common");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Link href={`/admin/products/${id}`} className={buttonClass("ghost", "sm")}>
        {tc("edit")}
      </Link>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => toggleProductActive(id, !active))}
      >
        {active ? t("deactivate") : t("activate")}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => duplicateProduct(id))}
      >
        {t("duplicate")}
      </Button>
      <ConfirmDialog
        triggerLabel={tc("delete")}
        title={t("deleteDialog.title")}
        description={t("deleteDialog.description", { name })}
        confirmLabel={t("deleteDialog.confirm")}
        cancelLabel={tc("cancel")}
        onConfirm={async () => {
          const result = await deleteProduct(id);
          return result.error ? t(`deleteErrors.${result.error}`) : undefined;
        }}
      />
    </div>
  );
}
