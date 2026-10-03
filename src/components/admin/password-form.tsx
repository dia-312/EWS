"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { checkNewPassword, MIN_PASSWORD_LENGTH } from "@/lib/team";
import { createClient } from "@/lib/supabase/client";

type Outcome = "saved" | "too_short" | "mismatch" | "same_as_email" | "failed" | null;

/** Lets the signed-in person change their own password. It goes straight to the sign-in service; the site never sees it. */
export function PasswordForm({ email }: { email: string | undefined }) {
  const t = useTranslations("admin.account.password");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      noValidate
      className="flex max-w-md flex-col gap-4 rounded-2xl border border-border bg-background p-5"
      onSubmit={(event) => {
        event.preventDefault();
        const problem = checkNewPassword(password, confirmation, email);
        if (problem) {
          setOutcome(problem);
          return;
        }
        startTransition(async () => {
          const { error } = await createClient().auth.updateUser({ password });
          if (error) {
            setOutcome("failed");
            return;
          }
          setPassword("");
          setConfirmation("");
          setOutcome("saved");
        });
      }}
      data-password-form
    >
      <h2 className="text-base font-bold">{t("title")}</h2>
      <TextField
        id="new_password"
        name="new_password"
        label={t("new")}
        type="password"
        autoComplete="new-password"
        hint={t("hint", { min: MIN_PASSWORD_LENGTH })}
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          setOutcome(null);
        }}
        error={outcome === "too_short" || outcome === "same_as_email" ? t(`errors.${outcome}`) : undefined}
      />
      <TextField
        id="confirm_password"
        name="confirm_password"
        label={t("confirm")}
        type="password"
        autoComplete="new-password"
        value={confirmation}
        onChange={(event) => {
          setConfirmation(event.target.value);
          setOutcome(null);
        }}
        error={outcome === "mismatch" ? t("errors.mismatch") : undefined}
      />
      {outcome === "failed" && (
        <p role="alert" className="text-sm text-danger">
          {t("errors.failed")}
        </p>
      )}
      {outcome === "saved" && (
        <p role="status" className="text-sm">
          {t("saved")}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? t("saving") : t("button")}
        </Button>
      </div>
    </form>
  );
}
