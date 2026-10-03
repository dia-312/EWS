"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * Shows the product's QR code so it can be scanned from another screen. The
 * generator is loaded only when the dialog is opened, so pages stay light.
 */
export function QrDialog({ url, productName }: { url: string; productName: string }) {
  const t = useTranslations("store.qr");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [svg, setSvg] = useState<string | null>(null);

  async function open() {
    dialogRef.current?.showModal();
    if (svg === null) {
      const { qrSvg } = await import("@/lib/qr");
      setSvg(qrSvg(url));
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" className="rounded-full" onClick={open} data-qr-open>
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
        </svg>
        {t("button")}
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby="qr-title"
        className="m-auto w-[min(22rem,calc(100%-2rem))] rounded-2xl border border-border bg-background p-6 text-center text-foreground backdrop:bg-black/50"
      >
        <h2 id="qr-title" className="text-lg font-bold">
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-muted">{t("hint")}</p>

        <div
          role="img"
          aria-label={t("label", { name: productName })}
          data-qr-url={url}
          className="mx-auto mt-4 aspect-square w-full max-w-64 overflow-hidden rounded-lg border border-border bg-white"
          // Generated here from our own link, so it only ever contains numbers and fixed tags.
          dangerouslySetInnerHTML={{ __html: svg ?? "" }}
        />

        <p className="mt-3 break-all text-xs text-muted" dir="ltr">
          {url}
        </p>
        <Button className="mt-4" variant="secondary" onClick={() => dialogRef.current?.close()}>
          {t("close")}
        </Button>
      </dialog>
    </>
  );
}
