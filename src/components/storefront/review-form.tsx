"use client";

import { useId, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MAX_COMMENT, MAX_NAME } from "@/lib/reviews";

type Status = "idle" | "saved" | "rating" | "link" | "failed";

/** "Rate this product". Reviews are shown after the store approves them. */
export function ReviewForm({ productId }: { productId: string }) {
  const t = useTranslations("store.reviews");
  const locale = useLocale();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [pending, startTransition] = useTransition();

  if (status === "saved") {
    return (
      <p role="status" className="rounded-xl border border-border bg-background px-4 py-3 text-sm" data-review-saved>
        {t("saved")}
      </p>
    );
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" className="self-start rounded-pill" onClick={() => setOpen(true)} data-review-open>
        {t("write")}
      </Button>
    );
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating < 1) {
      setStatus("rating");
      return;
    }
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const response = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            rating,
            name: String(data.get("name") ?? ""),
            comment: String(data.get("comment") ?? ""),
            locale,
            website: String(data.get("website") ?? ""),
          }),
        });
        if (response.ok) setStatus("saved");
        else setStatus((await response.json().catch(() => null))?.error?.code === "INVALID_REVIEW" ? "link" : "failed");
      } catch {
        setStatus("failed");
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex w-full max-w-lg flex-col gap-3 rounded-xl border border-border bg-background p-4" data-review-form>
      <fieldset className="flex flex-col gap-2">
        <legend className="font-medium">{t("yourRating")}</legend>
        <div className="flex gap-1" role="radiogroup" aria-label={t("yourRating")}>
          {[1, 2, 3, 4, 5].map((value) => (
            <label
              key={value}
              className={`flex size-10 cursor-pointer items-center justify-center rounded-lg border text-lg focus-within:outline-2 focus-within:outline-primary ${rating >= value ? "border-accent bg-accent/15 text-accent" : "border-border text-muted"}`}
            >
              <input
                type="radio"
                name="rating"
                value={value}
                checked={rating === value}
                onChange={() => {
                  setRating(value);
                  setStatus("idle");
                }}
                className="sr-only"
                aria-label={t("starsLabel", { count: value })}
              />
              <span aria-hidden>★</span>
            </label>
          ))}
        </div>
        {status === "rating" && (
          <p role="alert" className="text-sm text-danger">
            {t("ratingRequired")}
          </p>
        )}
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-name`} className="text-sm font-medium">
          {t("name")}
        </label>
        <input id={`${id}-name`} name="name" type="text" maxLength={MAX_NAME} autoComplete="given-name" className="rounded-lg border border-border bg-surface px-3 py-2" />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-comment`} className="text-sm font-medium">
          {t("comment")}
        </label>
        <textarea
          id={`${id}-comment`}
          name="comment"
          rows={3}
          maxLength={MAX_COMMENT}
          onChange={() => status === "link" && setStatus("idle")}
          className="rounded-lg border border-border bg-surface px-3 py-2"
        />
        {status === "link" && (
          <p role="alert" className="text-sm text-danger">
            {t("noLinks")}
          </p>
        )}
      </div>

      {/* hidden from people, but a bot filling every field will fill this one */}
      <div aria-hidden className="absolute -start-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <p className="text-sm text-muted">{t("moderation")}</p>

      {status === "failed" && (
        <p role="alert" className="text-sm text-danger">
          {t("failed")}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? t("sending") : t("submit")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
