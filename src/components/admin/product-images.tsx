"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  deleteProductImage,
  moveProductImage,
  reorderProductImages,
  registerProductImage,
  setPrimaryImage,
  updateImageAlt,
  type ImageActionResult,
} from "@/app/admin/(panel)/products/image-actions";
import { SortableList } from "@/components/admin/sortable";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { compressImage } from "@/lib/image-compress";
import {
  ACCEPTED_IMAGE_TYPES,
  buildImagePath,
  extensionForType,
  FULL_SIZE,
  MAX_IMAGES_PER_PRODUCT,
  MAX_INPUT_BYTES,
  PRODUCT_IMAGES_BUCKET,
  THUMB_SIZE,
  thumbPath,
  thumbUrl,
} from "@/lib/images";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";

export type ProductImageItem = {
  id: string;
  public_url: string | null;
  alt_text_ar: string | null;
  alt_text_en: string | null;
  is_primary: boolean;
};

type ProductImagesProps = {
  storeId: string;
  productId: string;
  images: ProductImageItem[];
};

const CACHE_SECONDS = "31536000";

export function ProductImages({ storeId, productId, images }: ProductImagesProps) {
  const t = useTranslations("admin.products.images");
  const tc = useTranslations("admin.common");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const atLimit = images.length >= MAX_IMAGES_PER_PRODUCT;

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setBusy(true);
    setErrors([]);
    const problems: string[] = [];
    const supabase = createClient();
    const storage = supabase.storage.from(PRODUCT_IMAGES_BUCKET);
    let room = MAX_IMAGES_PER_PRODUCT - images.length;

    for (const file of files) {
      if (room <= 0) {
        problems.push(t("errors.limit", { max: MAX_IMAGES_PER_PRODUCT }));
        break;
      }
      if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
        problems.push(t("errors.type", { name: file.name }));
        continue;
      }
      if (file.size > MAX_INPUT_BYTES) {
        problems.push(t("errors.tooLarge", { name: file.name }));
        continue;
      }

      let uploaded: string[] = [];
      try {
        const [full, thumb] = await Promise.all([
          compressImage(file, FULL_SIZE),
          compressImage(file, THUMB_SIZE),
        ]);
        const path = buildImagePath(
          storeId,
          productId,
          crypto.randomUUID(),
          extensionForType(full.mimeType),
        );

        for (const [target, variant] of [
          [path, full],
          [thumbPath(path), thumb],
        ] as const) {
          const { error } = await storage.upload(target, variant.blob, {
            contentType: variant.mimeType,
            cacheControl: CACHE_SECONDS,
            upsert: false,
          });
          if (error) throw error;
          uploaded = [...uploaded, target];
        }

        const result = await registerProductImage(productId, path);
        if (result.error) {
          await storage.remove(uploaded);
          problems.push(
            result.error === "limit"
              ? t("errors.limit", { max: MAX_IMAGES_PER_PRODUCT })
              : t("errors.uploadFailed", { name: file.name }),
          );
          continue;
        }
        room -= 1;
      } catch {
        if (uploaded.length > 0) await storage.remove(uploaded);
        problems.push(t("errors.uploadFailed", { name: file.name }));
      }
    }

    setErrors(problems);
    setBusy(false);
    router.refresh();
  }

  function run(action: () => Promise<ImageActionResult>) {
    startTransition(async () => {
      const result = await action();
      setErrors(result.error ? [t("errors.actionFailed")] : []);
    });
  }

  return (
    <section
      aria-labelledby="images-title"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5"
    >
      <div>
        <h2 id="images-title" className="text-base font-bold">
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-muted">{t("hint", { max: MAX_IMAGES_PER_PRODUCT })}</p>
      </div>

      <label
        onDragOver={(event) => {
          event.preventDefault();
          if (!atLimit) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!atLimit && !busy) void uploadFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-8 text-center text-sm transition-colors",
          "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary",
          dragging ? "border-primary bg-surface" : "border-border",
          (atLimit || busy) && "cursor-not-allowed opacity-60",
        )}
      >
        <input
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          multiple
          disabled={atLimit || busy}
          className="sr-only"
          onChange={(event) => {
            const input = event.target;
            void uploadFiles(input.files ?? []).then(() => {
              input.value = "";
            });
          }}
        />
        <span className="font-medium">
          {busy ? t("uploading") : atLimit ? t("limitReached") : t("drop")}
        </span>
        <span className="text-xs text-muted">{t("formats")}</span>
      </label>

      {errors.length > 0 && (
        <ul role="alert" className="flex flex-col gap-1 text-sm text-danger">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      {images.length === 0 ? (
        <p className="text-sm text-muted">{t("empty")}</p>
      ) : (
        <SortableList
          as="ul"
          grid
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          itemClassName="rounded-xl border border-border bg-surface p-3"
          onReorder={(ids) => reorderProductImages(productId, ids)}
          items={images.map((image, index) => ({
            id: image.id,
            label: image.alt_text_ar || image.alt_text_en || String(index + 1),
            node: (
              <ImageCard
                image={image}
                isFirst={index === 0}
                isLast={index === images.length - 1}
                disabled={pending || busy}
                onRun={run}
              />
            ),
          }))}
        />
      )}

      <p className="sr-only" role="status">
        {busy || pending ? tc("saving") : ""}
      </p>
    </section>
  );
}

function ImageCard({
  image,
  isFirst,
  isLast,
  disabled,
  onRun,
}: {
  image: ProductImageItem;
  isFirst: boolean;
  isLast: boolean;
  disabled: boolean;
  onRun: (action: () => Promise<ImageActionResult>) => void;
}) {
  const t = useTranslations("admin.products.images");
  const tc = useTranslations("admin.common");
  const [altAr, setAltAr] = useState(image.alt_text_ar ?? "");
  const [altEn, setAltEn] = useState(image.alt_text_en ?? "");
  const altDirty =
    altAr !== (image.alt_text_ar ?? "") || altEn !== (image.alt_text_en ?? "");

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-background">
        {image.public_url && (
          // Plain <img>: the files are already resized and compressed at upload.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl(image.public_url)}
            alt={altAr || altEn || ""}
            width={480}
            height={480}
            loading="lazy"
            className="size-full object-contain"
          />
        )}
        {image.is_primary && (
          <span className="absolute start-2 top-2 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
            {t("primary")}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <Button
          variant="secondary"
          size="sm"
          aria-label={t("moveEarlier")}
          title={t("moveEarlier")}
          disabled={disabled || isFirst}
          onClick={() => onRun(() => moveProductImage(image.id, "earlier"))}
        >
          <span aria-hidden className="inline-block rtl:-scale-x-100">←</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          aria-label={t("moveLater")}
          title={t("moveLater")}
          disabled={disabled || isLast}
          onClick={() => onRun(() => moveProductImage(image.id, "later"))}
        >
          <span aria-hidden className="inline-block rtl:-scale-x-100">→</span>
        </Button>
        {!image.is_primary && (
          <Button
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => onRun(() => setPrimaryImage(image.id))}
          >
            {t("makePrimary")}
          </Button>
        )}
        <ConfirmDialog
          triggerLabel={tc("delete")}
          title={t("deleteDialog.title")}
          description={t("deleteDialog.description")}
          confirmLabel={t("deleteDialog.confirm")}
          cancelLabel={tc("cancel")}
          onConfirm={async () => {
            const result = await deleteProductImage(image.id);
            return result.error ? t("errors.actionFailed") : undefined;
          }}
        />
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer font-medium">{t("alt.summary")}</summary>
        <div className="mt-2 flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-xs font-medium">
            {t("alt.ar")}
            <input
              value={altAr}
              onChange={(event) => setAltAr(event.target.value)}
              maxLength={200}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            {t("alt.en")}
            <input
              value={altEn}
              onChange={(event) => setAltEn(event.target.value)}
              maxLength={200}
              dir="ltr"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
            />
          </label>
          <div>
            <Button
              size="sm"
              disabled={disabled || !altDirty}
              onClick={() =>
                onRun(() =>
                  updateImageAlt(image.id, { alt_text_ar: altAr, alt_text_en: altEn }),
                )
              }
            >
              {t("alt.save")}
            </Button>
          </div>
        </div>
      </details>
    </div>
  );
}
