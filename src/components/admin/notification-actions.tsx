"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteNotification, markNotified } from "@/app/admin/(panel)/notifications/actions";
import { Button, buttonClass } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export type ContactLink = { kind: "whatsapp" | "email" | "call"; href: string };

export function NotificationActions({
  id,
  notified,
  links,
  productName,
}: {
  id: string;
  notified: boolean;
  links: ContactLink[];
  productName: string;
}) {
  const t = useTranslations("admin.notifications");
  const tc = useTranslations("admin.common");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap items-center gap-1">
        {!notified &&
          links.map((link) => (
            <a
              key={link.kind}
              href={link.href}
              target={link.kind === "whatsapp" ? "_blank" : undefined}
              rel={link.kind === "whatsapp" ? "noopener noreferrer" : undefined}
              className={buttonClass("secondary", "sm")}
              data-contact-link={link.kind}
            >
              {t(`contact.${link.kind}`)}
            </a>
          ))}
        {!notified && (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            aria-label={`${t("markNotified")}: ${productName}`}
            onClick={() =>
              startTransition(async () => {
                const result = await markNotified(id);
                setError(result.error ? t("failed") : undefined);
              })
            }
          >
            {t("markNotified")}
          </Button>
        )}
        <ConfirmDialog
          triggerLabel={tc("delete")}
          title={t("deleteDialog.title")}
          description={t("deleteDialog.description")}
          confirmLabel={t("deleteDialog.confirm")}
          cancelLabel={tc("cancel")}
          onConfirm={async () => {
            const result = await deleteNotification(id);
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
