"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteReview, setReviewStatus } from "@/app/admin/(panel)/reviews/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function ReviewActions({ id, status }: { id: string; status: "pending" | "approved" | "rejected" }) {
  const t = useTranslations("admin.reviews");
  const tc = useTranslations("admin.common");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  const change = (next: "approved" | "rejected" | "pending") =>
    startTransition(async () => {
      const result = await setReviewStatus(id, next);
      setError(result.error ? t("failed") : undefined);
    });

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap items-center gap-1">
        {status !== "approved" && (
          <Button size="sm" disabled={pending} onClick={() => change("approved")}>
            {t("approve")}
          </Button>
        )}
        {status !== "rejected" && (
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => change("rejected")}>
            {t("reject")}
          </Button>
        )}
        {status !== "pending" && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => change("pending")}>
            {t("backToPending")}
          </Button>
        )}
        <ConfirmDialog
          triggerLabel={tc("delete")}
          title={t("deleteDialog.title")}
          description={t("deleteDialog.description")}
          confirmLabel={t("deleteDialog.confirm")}
          cancelLabel={tc("cancel")}
          onConfirm={async () => {
            const result = await deleteReview(id);
            return result.error ? t("failed") : undefined;
          }}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
