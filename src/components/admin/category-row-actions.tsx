"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  deleteCategory,
  moveCategory,
  toggleCategoryActive,
} from "@/app/admin/(panel)/categories/actions";
import { Button, buttonClass } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type CategoryRowActionsProps = {
  id: string;
  name: string;
  active: boolean;
  isFirst: boolean;
  isLast: boolean;
};

export function CategoryRowActions({
  id,
  name,
  active,
  isFirst,
  isLast,
}: CategoryRowActionsProps) {
  const t = useTranslations("admin.categories");
  const tc = useTranslations("admin.common");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        aria-label={t("moveUp")}
        title={t("moveUp")}
        disabled={pending || isFirst}
        onClick={() => startTransition(() => moveCategory(id, "up"))}
      >
        ↑
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-label={t("moveDown")}
        title={t("moveDown")}
        disabled={pending || isLast}
        onClick={() => startTransition(() => moveCategory(id, "down"))}
      >
        ↓
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(() => toggleCategoryActive(id, !active))
        }
      >
        {active ? t("deactivate") : t("activate")}
      </Button>
      <Link
        href={`/admin/categories/${id}`}
        className={buttonClass("ghost", "sm")}
      >
        {tc("edit")}
      </Link>
      <ConfirmDialog
        triggerLabel={tc("delete")}
        title={t("deleteDialog.title")}
        description={t("deleteDialog.description", { name })}
        confirmLabel={t("deleteDialog.confirm")}
        cancelLabel={tc("cancel")}
        onConfirm={async () => {
          const result = await deleteCategory(id);
          return result.error ? t(`deleteErrors.${result.error}`) : undefined;
        }}
      />
    </div>
  );
}
