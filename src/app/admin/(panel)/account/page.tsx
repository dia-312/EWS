import { getTranslations } from "next-intl/server";
import { PasswordForm } from "@/components/admin/password-form";
import { requireAdmin } from "@/lib/auth";
import { isTeamRole } from "@/lib/team";

export default async function AdminAccountPage() {
  const [session, t] = await Promise.all([requireAdmin(), getTranslations("admin.account")]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <dl className="grid max-w-md gap-3 rounded-2xl border border-border bg-background p-5 text-sm" data-account>
        <div>
          <dt className="text-muted">{t("name")}</dt>
          <dd className="font-medium">{session.displayName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">{t("email")}</dt>
          <dd className="font-medium" dir="ltr">
            {session.email}
          </dd>
        </div>
        <div>
          <dt className="text-muted">{t("role")}</dt>
          <dd className="font-medium">{isTeamRole(session.role) ? t(`roles.${session.role}`) : session.role}</dd>
        </div>
      </dl>

      <PasswordForm email={session.email} />
    </div>
  );
}
