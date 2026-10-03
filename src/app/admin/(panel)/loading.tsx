import { getTranslations } from "next-intl/server";

export default async function AdminLoading() {
  const t = await getTranslations("admin.states");
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4" data-loading>
      <span className="sr-only">{t("loading")}</span>
      <div className="h-8 w-56 animate-pulse rounded-lg bg-border motion-reduce:animate-none" />
      <div aria-hidden className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-border/60 motion-reduce:animate-none" />
        ))}
      </div>
      <div aria-hidden className="h-64 animate-pulse rounded-2xl bg-border/60 motion-reduce:animate-none" />
    </div>
  );
}
