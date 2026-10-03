"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/button";
import { QR_QUIET_ZONE, qrModules, qrSvg } from "@/lib/qr";

const PNG_SIZE = 1024;

function download(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
}

function pngDataUrl(url: string): string {
  const modules = qrModules(url);
  const count = modules.length + QR_QUIET_ZONE * 2;
  const cell = Math.floor(PNG_SIZE / count);
  const size = cell * count;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size, size);
  context.fillStyle = "#000000";
  modules.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) context.fillRect((x + QR_QUIET_ZONE) * cell, (y + QR_QUIET_ZONE) * cell, cell, cell);
    }),
  );
  return canvas.toDataURL("image/png");
}

/** The product's QR code for shelf labels and boxes, with print-ready downloads. */
export function ProductQr({ url, slug }: { url: string; slug: string }) {
  const t = useTranslations("admin.products.qr");
  const svg = useMemo(() => qrSvg(url), [url]);

  return (
    <section aria-labelledby="product-qr-title" className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <h2 id="product-qr-title" className="text-lg font-bold">
        {t("title")}
      </h2>
      <p className="text-sm text-muted">{t("description")}</p>
      <div className="flex flex-wrap items-start gap-4">
        <div
          role="img"
          aria-label={t("label")}
          className="size-40 shrink-0 overflow-hidden rounded-lg border border-border bg-white"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <p className="text-sm">
            <span className="font-medium">{t("link")}: </span>
            <span className="break-all text-muted" dir="ltr">
              {url}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonClass("secondary", "sm")}
              onClick={() =>
                download(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, `${slug}-qr.svg`)
              }
            >
              {t("downloadSvg")}
            </button>
            <button
              type="button"
              className={buttonClass("secondary", "sm")}
              onClick={() => download(pngDataUrl(url), `${slug}-qr.png`)}
            >
              {t("downloadPng")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
