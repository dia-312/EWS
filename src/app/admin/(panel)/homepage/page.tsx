import { getLocale, getTranslations } from "next-intl/server";
import { SectionRowActions } from "@/components/admin/section-row-actions";
import { SortableList } from "@/components/admin/sortable";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select";
import { requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { pickLocalized } from "@/lib/format";
import { isProductSection, missingSectionTypes, readLimit } from "@/lib/homepage";
import { createClient } from "@/lib/supabase/server";
import { addBanner, addSection, reorderSections } from "./actions";

export default async function AdminHomepagePage({ searchParams }: PageProps<"/admin/homepage">) {
  const [session, locale, t, params] = await Promise.all([
    requireAdmin(),
    getLocale(),
    getTranslations("admin.homepage"),
    searchParams,
  ]);
  const db = await createClient();

  const { data: sections, error } = await db
    .from("homepage_sections")
    .select("id, type, title_ar, title_en, config, active, display_order")
    .eq("store_id", session.storeId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  const canEdit = session.role !== "viewer";
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const saved = first(params.saved) === "1";
  const errorCode = ["invalid_type", "already_added", "add_failed"].find((code) => code === first(params.error));
  const missing = missingSectionTypes((sections ?? []).map((section) => section.type));

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("intro")}</p>
      </div>

      {saved && (
        <p role="status" className="rounded-lg border border-border bg-background px-4 py-3 text-sm">
          {t("saved")}
        </p>
      )}
      {errorCode && (
        <p role="alert" className="rounded-lg border border-danger px-4 py-3 text-sm text-danger">
          {t(`errors.${errorCode as "add_failed"}`)}
        </p>
      )}

      {error ? (
        <p role="alert" className="text-danger">
          {t("loadError")}
        </p>
      ) : sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center">
          <p className="font-bold">{t("empty.title")}</p>
          <p className="mt-1 text-sm text-muted">{t("empty.body")}</p>
        </div>
      ) : (
        <SortableList
          className="flex flex-col gap-2"
          itemClassName="rounded-xl border border-border bg-background p-4"
          onReorder={reorderSections}
          disabled={!canEdit}
          items={sections.map((section, index) => {
            const name = t(`types.${section.type}.name`);
            const title = pickLocalized(locale, section.title_ar, section.title_en);
            return {
              id: section.id,
              label: name,
              node: (
                <div
                  className={cn(
                    "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
                    !section.active && "opacity-70",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-bold text-muted"
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium">
                        <span data-section-name>{name}</span>
                        <span
                          className={cn(
                            "ms-2 rounded-full px-2 py-0.5 text-xs font-medium",
                            section.active ? "bg-green-100 text-green-800" : "bg-surface text-muted",
                          )}
                        >
                          {section.active ? t("status.visible") : t("status.hidden")}
                        </span>
                      </p>
                      <p className="text-sm text-muted">
                        {title || t("defaultTitle")}
                        {isProductSection(section.type) && (
                          <> · {t("showsProducts", { count: readLimit(section.config) })}</>
                        )}
                      </p>
                      <p className="text-xs text-muted">{t(`types.${section.type}.description`)}</p>
                    </div>
                  </div>
                  {canEdit && (
                    <SectionRowActions
                      id={section.id}
                      name={name}
                      active={section.active}
                      isFirst={index === 0}
                      isLast={index === sections.length - 1}
                    />
                  )}
                </div>
              ),
            };
          })}
        />
      )}

      {canEdit && (
        <section aria-labelledby="add-section-title" className="rounded-2xl border border-border bg-background p-5">
          <h2 id="add-section-title" className="text-base font-bold">
            {t("add.title")}
          </h2>
          {missing.length === 0 ? (
            <p className="mt-1 text-sm text-muted">{t("add.none")}</p>
          ) : (
            <form action={addSection} className="mt-3 flex flex-wrap items-end gap-3">
              <div className="min-w-56 flex-1">
                <SelectField id="type" name="type" label={t("add.label")} defaultValue={missing[0]}>
                  {missing.map((type) => (
                    <option key={type} value={type}>
                      {t(`types.${type}.name`)}
                    </option>
                  ))}
                </SelectField>
              </div>
              <Button type="submit">{t("add.button")}</Button>
            </form>
          )}
          <form action={addBanner} className="mt-4 border-t border-border pt-4">
            <p className="mb-2 text-sm text-muted">{t("add.bannerHint")}</p>
            <Button type="submit" variant="secondary">
              {t("add.banner")}
            </Button>
          </form>
        </section>
      )}
    </div>
  );
}
