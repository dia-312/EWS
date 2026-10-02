"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Runs on confirm. Return an error message to keep the dialog open. */
  onConfirm: () => Promise<string | undefined>;
};

/** Destructive-action confirmation built on the native <dialog> element. */
export function ConfirmDialog({
  triggerLabel,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function open() {
    setError(undefined);
    dialogRef.current?.showModal();
  }

  function confirm() {
    startTransition(async () => {
      const message = await onConfirm();
      if (message) setError(message);
      else dialogRef.current?.close();
    });
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="text-danger" onClick={open}>
        {triggerLabel}
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby="confirm-title"
        className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-2xl border border-border bg-background p-6 text-foreground backdrop:bg-black/40"
      >
        <h2 id="confirm-title" className="text-lg font-bold">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted">{description}</p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => dialogRef.current?.close()}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={confirm} disabled={pending}>
            {confirmLabel}
          </Button>
        </div>
      </dialog>
    </>
  );
}
