"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { addTeamMember, changeTeamRole, removeTeamMember, type TeamResult } from "@/app/admin/(panel)/team/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TextField } from "@/components/ui/field";
import { SelectField } from "@/components/ui/select";
import { TEAM_ROLES } from "@/lib/team";

export function AddTeamMemberForm() {
  const t = useTranslations("admin.team");
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>("editor");
  const [result, setResult] = useState<TeamResult | null>(null);

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const outcome = await addTeamMember(email, role, name);
          setResult(outcome);
          if (outcome === "ok") {
            setEmail("");
            setName("");
          }
        });
      }}
      data-team-add
    >
      <h2 className="text-base font-bold">{t("add.title")}</h2>
      <ol className="list-decimal ps-5 text-sm leading-relaxed text-muted">
        <li>{t("add.step1")}</li>
        <li>{t("add.step2")}</li>
      </ol>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id="team_email" name="email" label={t("add.email")} type="email" dir="ltr" value={email} onChange={(event) => { setEmail(event.target.value); setResult(null); }} />
        <TextField id="team_name" name="name" label={t("add.name")} value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      <SelectField id="team_role" name="role" label={t("add.role")} value={role} onChange={(event) => setRole(event.target.value)}>
        {TEAM_ROLES.map((value) => (
          <option key={value} value={value}>
            {t(`roles.${value}.name`)}
          </option>
        ))}
      </SelectField>
      <p className="text-sm text-muted">{t(`roles.${role as "owner"}.description`)}</p>

      {result && (
        <p role={result === "ok" ? "status" : "alert"} className={result === "ok" ? "text-sm" : "text-sm text-danger"}>
          {t(`results.${result}`)}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending || email.trim() === ""}>
          {pending ? t("add.adding") : t("add.button")}
        </Button>
      </div>
    </form>
  );
}

export function TeamMemberActions({ id, role, isSelf, label }: { id: string; role: string; isSelf: boolean; label: string }) {
  const t = useTranslations("admin.team");
  const tc = useTranslations("admin.common");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<TeamResult | null>(null);

  if (isSelf) return <span className="text-sm text-muted">{t("you")}</span>;

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`role-${id}`}>
          {t("changeRole", { name: label })}
        </label>
        <select
          id={`role-${id}`}
          value={role}
          disabled={pending}
          onChange={(event) =>
            startTransition(async () => {
              setResult(await changeTeamRole(id, event.target.value));
            })
          }
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
        >
          {TEAM_ROLES.map((value) => (
            <option key={value} value={value}>
              {t(`roles.${value}.name`)}
            </option>
          ))}
        </select>
        <ConfirmDialog
          triggerLabel={t("remove")}
          title={t("removeDialog.title")}
          description={t("removeDialog.description", { name: label })}
          confirmLabel={t("removeDialog.confirm")}
          cancelLabel={tc("cancel")}
          onConfirm={async () => {
            const outcome = await removeTeamMember(id);
            return outcome === "ok" ? undefined : t(`results.${outcome}`);
          }}
        />
      </div>
      {result && result !== "ok" && (
        <p role="alert" className="text-sm text-danger">
          {t(`results.${result}`)}
        </p>
      )}
    </div>
  );
}
