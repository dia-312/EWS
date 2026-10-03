"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  deleteSection,
  moveSection,
  toggleSection,
} from "@/app/admin/(panel)/homepage/actions";
import { Button, buttonClass } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type SectionRowActionsProps = {
  id: string;
  name: string;
  active: boolean;
  isFirst: boolean;
  isLast: boolean;
};

export function SectionRowActions({ id, name, active, isFirst, isLast }: SectionRowActionsProps) {
  const t = useTranslations("admin.homepage");
  const tc = useTranslations("admin.common");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button
        variant="secondary"
        size="sm"
        aria-label={`${t("moveUp")}: ${name}`}
        title={t("moveUp")}
        disabled={pending || isFirst}
        onClick={() => startTransition(() => moveSection(id, "up"))}
      >
        ↑
      </Button>
      <Button
        variant="secondary"
        size="sm"
        aria-label={`${t("moveDown")}: ${name}`}
        title={t("moveDown")}
        disabled={pending || isLast}
        onClick={() => startTransition(() => moveSection(id, "down"))}
      >
        ↓
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`${active ? t("hide") : t("show")}: ${name}`}
        disabled={pending}
        onClick={() => startTransition(() => toggleSection(id, !active))}
      >
        {active ? t("hide") : t("show")}
      </Button>
      <Link
        href={`/admin/homepage/${id}`}
        aria-label={`${tc("edit")}: ${name}`}
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
          const result = await deleteSection(id);
          return result.error ? t(`deleteErrors.${result.error}`) : undefined;
        }}
      />
    </div>
  );
}
