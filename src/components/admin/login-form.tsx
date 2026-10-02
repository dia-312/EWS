"use client";

import { useTranslations } from "next-intl";
import { signIn, type SignInState } from "@/app/admin/login/actions";
import { useActionForm } from "@/lib/use-action-form";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function LoginForm({ initialError }: { initialError?: "forbidden" }) {
  const t = useTranslations("admin.login");
  const { state, onSubmit, pending } = useActionForm<SignInState>(signIn, {});
  const errorKey = state.error ?? initialError;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          {t("email")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          dir="ltr"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          {t("password")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          dir="ltr"
          className={inputClass}
        />
      </div>

      {errorKey && (
        <p role="alert" className="text-sm text-danger">
          {t(`errors.${errorKey}`)}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
      >
        {pending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
