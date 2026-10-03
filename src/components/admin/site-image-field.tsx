"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { type ImageTarget, saveSiteImage } from "@/app/admin/(panel)/image-actions";
import { buttonClass } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { compressImage } from "@/lib/image-compress";
import { ACCEPTED_IMAGE_TYPES, extensionForType, MAX_INPUT_BYTES } from "@/lib/images";
import { buildSiteImagePath, SITE_IMAGE_MAX_EDGE, siteImageBucket } from "@/lib/site-images";
import { createClient } from "@/lib/supabase/client";

type SiteImageFieldProps = {
  storeId: string;
  target: ImageTarget;
  imageUrl: string | null;
  title: string;
  hint: string;
  /** Shape of the preview box, as a CSS aspect ratio (for example "16 / 5"). */
  aspect?: string;
};

/** Upload, replace and remove one picture of the site. The browser resizes it before it is sent. */
export function SiteImageField({ storeId, target, imageUrl, title, hint, aspect = "16 / 9" }: SiteImageFieldProps) {
  const t = useTranslations("admin.siteImage");
  const tc = useTranslations("admin.common");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const headingId = `image-${target.kind}-${"id" in target ? target.id : "site"}`;

  async function upload(file: File | undefined) {
    if (!file) return;
    setError(undefined);

    if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      setError(t("errors.type"));
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError(t("errors.tooLarge"));
      return;
    }

    setBusy(true);
    const storage = createClient().storage.from(siteImageBucket(target.kind));
    let path: string | undefined;
    try {
      const image = await compressImage(file, SITE_IMAGE_MAX_EDGE[target.kind]);
      path = buildSiteImagePath(storeId, target.kind, crypto.randomUUID(), extensionForType(image.mimeType));

      const { error: uploadError } = await storage.upload(path, image.blob, {
        contentType: image.mimeType,
        cacheControl: "31536000",
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const result = await saveSiteImage(target, path);
      if (result.error) throw new Error(result.error);
      router.refresh();
    } catch {
      if (path) await storage.remove([path]);
      setError(t("errors.uploadFailed"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5" data-site-image={target.kind}>
      <div>
        <h2 id={headingId} className="text-base font-bold">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted">{hint}</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div
          className="flex w-full max-w-sm items-center justify-center overflow-hidden rounded-xl border border-border bg-surface"
          style={{ aspectRatio: aspect }}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="px-2 text-center text-xs text-muted">{t("none")}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label
            className={`${buttonClass("secondary")} cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${busy ? "pointer-events-none opacity-50" : ""}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              disabled={busy}
              className="sr-only"
              aria-label={title}
              onChange={(event) => void upload(event.target.files?.[0])}
            />
            {busy ? t("uploading") : imageUrl ? t("replace") : t("upload")}
          </label>

          {imageUrl && (
            <ConfirmDialog
              triggerLabel={tc("delete")}
              title={t("deleteDialog.title")}
              description={t("deleteDialog.description")}
              confirmLabel={t("deleteDialog.confirm")}
              cancelLabel={tc("cancel")}
              onConfirm={async () => {
                const result = await saveSiteImage(target, null);
                if (result.error) return t("errors.actionFailed");
                router.refresh();
                return undefined;
              }}
            />
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
