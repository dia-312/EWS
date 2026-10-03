"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { saveBannerLink } from "@/app/admin/(panel)/image-actions";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";

/** Where a promotional banner leads when it is tapped (a page of the site, or an https address). */
export function BannerLink({ sectionId, initial }: { sectionId: string; initial: string }) {
  const t = useTranslations("admin.homepage.banner");
  const [pending, startTransition] = useTransition();
  const [link, setLink] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saved" | "invalid" | "failed">("idle");

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-5" aria-labelledby="banner-link-title">
      <h2 id="banner-link-title" className="text-base font-bold">
        {t("linkTitle")}
      </h2>
      <TextField
        id="banner_link"
        name="banner_link"
        label={t("linkLabel")}
        hint={t("linkHint")}
        dir="ltr"
        value={link}
        onChange={(event) => {
          setLink(event.target.value);
          setStatus("idle");
        }}
        error={status === "invalid" ? t("linkInvalid") : undefined}
      />
      <div className="flex items-center gap-3">
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await saveBannerLink(sectionId, link);
              setStatus(result.error === "invalid" ? "invalid" : result.error ? "failed" : "saved");
            })
          }
        >
          {t("saveLink")}
        </Button>
        {status === "saved" && (
          <p role="status" className="text-sm">
            {t("linkSaved")}
          </p>
        )}
        {status === "failed" && (
          <p role="alert" className="text-sm text-danger">
            {t("linkFailed")}
          </p>
        )}
      </div>
    </section>
  );
}
