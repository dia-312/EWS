"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { shareTargets } from "@/lib/share";
import { useShopStore } from "@/lib/shop-store";
import { track } from "@/lib/track";

type ShareButtonProps = {
  productId: string;
  /** The canonical address of the page being shared. */
  url: string;
  title: string;
  /** A short sentence that goes with the link, for example the name and price. */
  text: string;
};

/**
 * Opens the phone's own share sheet when the browser has one (Web Share API);
 * otherwise a small dialog with copy-link and a few share links.
 */
export function ShareButton({ productId, url, title, text }: ShareButtonProps) {
  const t = useTranslations("store.share");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const showNotice = useShopStore((state) => state.showNotice);
  const announce = useShopStore((state) => state.announce);

  async function share() {
    track({ type: "share", productId });
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        // Closing the share sheet is not a failure; anything else falls back to the dialog.
        if ((error as DOMException).name === "AbortError") return;
      }
    }
    dialogRef.current?.showModal();
  }

  /** Closes the dialog so the "copied" message is not hidden behind its backdrop. */
  function done() {
    dialogRef.current?.close();
    showNotice("link_copied");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      done();
      return;
    } catch {
      /* clipboard blocked: select the text so it can be copied by hand */
    }
    const input = inputRef.current;
    if (input) {
      input.focus();
      input.select();
      if (document.execCommand?.("copy")) {
        done();
        return;
      }
    }
    announce(t("copyManually"));
  }

  return (
    <>
      <Button variant="secondary" size="sm" className="rounded-pill" onClick={share} data-share>
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        {t("share")}
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby="share-title"
        className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-2xl border border-border bg-background p-6 text-foreground backdrop:bg-black/50"
      >
        <h2 id="share-title" className="text-lg font-bold">
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-muted">{text}</p>

        <div className="mt-4 flex gap-2">
          <label htmlFor="share-link" className="sr-only">
            {t("link")}
          </label>
          <input
            id="share-link"
            ref={inputRef}
            readOnly
            value={url}
            dir="ltr"
            onFocus={(event) => event.currentTarget.select()}
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          <Button onClick={copy} size="sm">
            {t("copy")}
          </Button>
        </div>

        <ul className="mt-4 grid grid-cols-2 gap-2">
          {shareTargets(url, text).map((target) => (
            <li key={target.key}>
              <a
                href={target.href}
                target={target.key === "email" ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="block rounded-lg border border-border px-3 py-2 text-center text-sm transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary"
              >
                {t(`targets.${target.key}`)}
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex justify-end">
          <Button variant="secondary" onClick={() => dialogRef.current?.close()}>
            {t("close")}
          </Button>
        </div>
      </dialog>
    </>
  );
}
