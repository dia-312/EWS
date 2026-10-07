"use client";

import { useId, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { parseContact, type NotifyType } from "@/lib/notify";

type Status = "idle" | "saved" | "invalid" | "failed";

/**
 * "Tell me when it is back" (out of stock) or "tell me if the price drops" (in stock).
 * It stays a button until the visitor wants it; the contact is kept only to answer this request.
 */
export function NotifyForm({ productId, type }: { productId: string; type: NotifyType }) {
  const t = useTranslations(`store.notify.${type}`);
  const tc = useTranslations("store.notify");
  const locale = useLocale();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [pending, startTransition] = useTransition();

  if (status === "saved") {
    return (
      <p role="status" className="rounded-xl border border-border bg-background px-4 py-3 text-sm" data-notify-saved>
        {t("saved")}
      </p>
    );
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" className="rounded-pill" onClick={() => setOpen(true)} data-notify-open={type}>
        {t("button")}
      </Button>
    );
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!parseContact(contact)) {
      setStatus("invalid");
      return;
    }
    const website = String(new FormData(event.currentTarget).get("website") ?? "");
    startTransition(async () => {
      try {
        const response = await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, type, contact, locale, consent, website }),
        });
        if (response.ok) setStatus("saved");
        else setStatus((await response.json().catch(() => null))?.error?.code === "INVALID_CONTACT" ? "invalid" : "failed");
      } catch {
        setStatus("failed");
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-border bg-background p-4" data-notify-form={type}>
      <p className="font-medium">{t("title")}</p>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-contact`} className="text-sm font-medium">
          {tc("contactLabel")}
        </label>
        <input
          id={`${id}-contact`}
          name="contact"
          type="text"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          value={contact}
          onChange={(event) => {
            setContact(event.target.value);
            setStatus("idle");
          }}
          aria-invalid={status === "invalid"}
          aria-describedby={`${id}-hint`}
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
        <p id={`${id}-hint`} className={status === "invalid" ? "text-sm text-danger" : "text-sm text-muted"} role={status === "invalid" ? "alert" : undefined}>
          {status === "invalid" ? tc("invalid") : tc("contactHint")}
        </p>
      </div>

      {/* hidden from people, but a bot filling every field will fill this one */}
      <div aria-hidden className="absolute -start-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1" />
        <span>{tc("consent")}</span>
      </label>

      {status === "failed" && (
        <p role="alert" className="text-sm text-danger">
          {tc("failed")}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending || !consent}>
          {pending ? tc("sending") : t("submit")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}
