import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SectionForm } from "@/components/admin/section-form";
import { requireEditor } from "@/lib/auth";
import { isProductSection, readLimit } from "@/lib/homepage";
import { createClient } from "@/lib/supabase/server";
import { updateSection } from "../actions";

export default async function EditSectionPage({ params, searchParams }: PageProps<"/admin/homepage/[id]">) {
  const [session, { id }, query, t] = await Promise.all([
    requireEditor(),
    params,
    searchParams,
    getTranslations("admin.homepage"),
  ]);

  const db = await createClient();
  const { data: section } = await db
    .from("homepage_sections")
    .select("type, title_ar, title_en, subtitle_ar, subtitle_en, config")
    .eq("id", id)
    .eq("store_id", session.storeId)
    .maybeSingle();
  if (!section) notFound();

  // What visitors see when a title is left empty, in both languages.
  const [ar, en] = await Promise.all([
    getTranslations({ locale: "ar", namespace: "store.home.sections" }),
    getTranslations({ locale: "en", namespace: "store.home.sections" }),
  ]);
  const type = section.type as "hero";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t("form.editTitle", { name: t(`types.${type}.name`) })}</h1>
        <p className="mt-1 text-sm text-muted">{t(`types.${type}.description`)}</p>
      </div>

      {query.created === "1" && (
        <p role="status" className="rounded-lg border border-border bg-background px-4 py-3 text-sm">
          {t("form.created")}
        </p>
      )}

      <SectionForm
        action={updateSection.bind(null, id)}
        showLimit={isProductSection(section.type)}
        defaultTitles={{ ar: ar(type), en: en(type) }}
        initial={{
          title_ar: section.title_ar,
          title_en: section.title_en,
          subtitle_ar: section.subtitle_ar,
          subtitle_en: section.subtitle_en,
          limit: readLimit(section.config),
        }}
      />
    </div>
  );
}
