import { getLocale, getTranslations } from "next-intl/server";
import { AddTeamMemberForm, TeamMemberActions } from "@/components/admin/team-members";
import { requireOwner } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { isTeamRole } from "@/lib/team";
import { createClient } from "@/lib/supabase/server";

export default async function AdminTeamPage() {
  const [session, locale, t] = await Promise.all([requireOwner(), getLocale(), getTranslations("admin.team")]);
  const db = await createClient();
  const { data, error } = await db.rpc("team_members");

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("intro")}</p>
      </div>

      {error || !data ? (
        <p role="alert" className="text-danger">
          {t("loadError")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2" data-team-list>
          {data.map((member) => {
            const label = member.display_name || member.email;
            return (
              <li key={member.id} className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between" data-team-member={member.email}>
                <div className="min-w-0">
                  <p className="font-medium">
                    {label}
                    <span className="ms-2 rounded-full bg-surface px-2 py-0.5 text-xs font-medium" data-role>
                      {isTeamRole(member.role) ? t(`roles.${member.role}.name`) : member.role}
                    </span>
                  </p>
                  <p className="text-sm text-muted" dir="ltr">
                    {member.email}
                  </p>
                  <p className="text-xs text-muted">
                    {member.last_sign_in_at ? t("lastSignIn", { date: formatDate(member.last_sign_in_at, locale) }) : t("neverSignedIn")}
                  </p>
                </div>
                <TeamMemberActions id={member.id} role={member.role} isSelf={member.id === session.userId} label={label} />
              </li>
            );
          })}
        </ul>
      )}

      <AddTeamMemberForm />

      <section className="rounded-2xl border border-border bg-background p-5 text-sm" aria-labelledby="team-help">
        <h2 id="team-help" className="mb-2 text-base font-bold">
          {t("help.title")}
        </h2>
        <ul className="list-disc space-y-1 ps-5 text-muted">
          <li>{t("help.password")}</li>
          <li>{t("help.leave")}</li>
          <li>{t("help.roles")}</li>
        </ul>
      </section>
    </div>
  );
}
