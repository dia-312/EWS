"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  registerStoreLogo,
  removeStoreLogo,
} from "@/app/admin/(panel)/settings/logo-actions";
import { buttonClass } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { compressImage } from "@/lib/image-compress";
import { ACCEPTED_IMAGE_TYPES, extensionForType, MAX_INPUT_BYTES } from "@/lib/images";
import { buildLogoPath, LOGO_MAX_EDGE, STORE_LOGOS_BUCKET } from "@/lib/logo";
import { createClient } from "@/lib/supabase/client";

export function StoreLogo({
  storeId,
  storeName,
  logoUrl,
}: {
  storeId: string;
  storeName: string;
  logoUrl: string | null;
}) {
  const t = useTranslations("admin.settings.logo");
  const tc = useTranslations("admin.common");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

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
    const storage = createClient().storage.from(STORE_LOGOS_BUCKET);
    let path: string | undefined;
    try {
      const logo = await compressImage(file, LOGO_MAX_EDGE);
      path = buildLogoPath(storeId, crypto.randomUUID(), extensionForType(logo.mimeType));

      const { error: uploadError } = await storage.upload(path, logo.blob, {
        contentType: logo.mimeType,
        cacheControl: "31536000",
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const result = await registerStoreLogo(path);
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
    <section
      aria-labelledby="logo-title"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5"
    >
      <div>
        <h2 id="logo-title" className="text-base font-bold">
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-muted">{t("hint")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex size-24 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={storeName} className="size-full object-contain" />
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
              onChange={(event) => void upload(event.target.files?.[0])}
            />
            {busy ? t("uploading") : logoUrl ? t("replace") : t("upload")}
          </label>

          {logoUrl && (
            <ConfirmDialog
              triggerLabel={tc("delete")}
              title={t("deleteDialog.title")}
              description={t("deleteDialog.description")}
              confirmLabel={t("deleteDialog.confirm")}
              cancelLabel={tc("cancel")}
              onConfirm={async () => {
                const result = await removeStoreLogo();
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
