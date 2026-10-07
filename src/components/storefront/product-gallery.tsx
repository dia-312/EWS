"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { thumbUrl } from "@/lib/images";

export type GalleryImage = { id: string; url: string; alt: string };

/**
 * Main image with a row of thumbnails. The thumbnails are real buttons, so the
 * gallery works with the keyboard and screen readers.
 */
export function ProductGallery({ images, name }: { images: GalleryImage[]; name: string }) {
  const t = useTranslations("store.product");
  const [index, setIndex] = useState(0);
  const current = images[index];

  if (!current) {
    return (
      <div
        role="img"
        aria-label={t("noImage")}
        className="flex aspect-square items-center justify-center rounded-3xl border border-border bg-[radial-gradient(circle_at_50%_35%,var(--background),var(--surface))] text-muted shadow-card"
      >
        <svg viewBox="0 0 24 24" className="size-20" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="m21 16-5-5-8 8" />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-square overflow-hidden rounded-3xl border border-border/80 bg-[radial-gradient(circle_at_50%_35%,var(--background),var(--surface))] shadow-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.alt || name}
          width={1600}
          height={1600}
          fetchPriority="high"
          className="size-full object-contain p-6 sm:p-10"
        />
      </div>

      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto" aria-label={t("gallery")}>
          {images.map((image, position) => (
            <li key={image.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(position)}
                aria-label={t("showImage", { number: position + 1, total: images.length })}
                aria-current={position === index ? "true" : undefined}
                className={cn(
                  "size-[4.5rem] overflow-hidden rounded-xl border bg-background transition-all hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  position === index ? "border-primary ring-2 ring-primary/70" : "border-border opacity-80 hover:opacity-100",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbUrl(image.url)}
                  alt=""
                  width={64}
                  height={64}
                  loading="lazy"
                  className="size-full object-contain p-1"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
