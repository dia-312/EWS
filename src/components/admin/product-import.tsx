"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, buttonClass } from "@/components/ui/button";
import { toCsv } from "@/lib/csv";
import { IMPORT_COLUMNS } from "@/lib/product-import";
import {
  type ApplyResult,
  applyImport,
  type PreviewResult,
  previewImport,
} from "@/app/admin/(panel)/products/import/actions";

type CategoryOption = { slug: string; name: string };

/** The template the owner fills in: header plus two example rows that use a real category of the store. */
function templateCsv(categorySlug: string): string {
  const sample = (values: Partial<Record<(typeof IMPORT_COLUMNS)[number], string>>) =>
    IMPORT_COLUMNS.map((column) => values[column] ?? "");
  return toCsv([
    [...IMPORT_COLUMNS],
    sample({
      slug: "example-headphones",
      name_ar: "سماعة مثال",
      name_en: "Example Headphones",
      category: categorySlug,
      brand: "Sony",
      price: "120",
      availability: "in_stock",
      short_description_ar: "سماعة لاسلكية بصوت نقي",
      short_description_en: "Wireless headphones with clear sound",
      search_aliases: "سماعه | headset",
      featured: "yes",
      bestseller: "no",
    }),
    sample({
      slug: "example-charger",
      name_ar: "شاحن مثال",
      category: categorySlug,
      price: "35.50",
      availability: "limited",
    }),
  ]);
}

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ProductImport({ categories }: { categories: CategoryOption[] }) {
  const t = useTranslations("admin.import");
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [pending, startTransition] = useTransition();

  const formData = () => {
    const data = new FormData();
    if (file) data.set("file", file);
    return data;
  };

  function check() {
    setResult(null);
    startTransition(async () => setPreview(await previewImport(formData())));
  }

  function run() {
    startTransition(async () => {
      setResult(await applyImport(formData()));
      setPreview(null);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  const ready = preview && !("error" in preview) ? preview : null;
  const importable = ready ? ready.created + ready.updated : 0;

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <section aria-labelledby="import-steps" className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-5">
        <h2 id="import-steps" className="text-lg font-bold">
          {t("howTitle")}
        </h2>
        <ol className="list-decimal ps-5 text-sm leading-relaxed">
          <li>{t("step1")}</li>
          <li>{t("step2")}</li>
          <li>{t("step3")}</li>
        </ol>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => download("products-template.csv", templateCsv(categories[0]?.slug ?? "category-slug"))}
          >
            {t("downloadTemplate")}
          </Button>
          <a href="/admin/products/export" download className={buttonClass("secondary", "sm")}>
            {t("exportExisting")}
          </a>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">{t("rulesTitle")}</summary>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-muted">
            <li>{t("rules.slug")}</li>
            <li>{t("rules.required")}</li>
            <li>{t("rules.blank")}</li>
            <li>{t("rules.hidden")}</li>
            <li>{t("rules.brand")}</li>
            <li>{t("rules.values")}</li>
            <li>{t("rules.limits")}</li>
          </ul>
          <p className="mt-3 font-medium">{t("categoriesTitle")}</p>
          <ul className="mt-1 flex flex-wrap gap-2" dir="ltr">
            {categories.map((category) => (
              <li key={category.slug} className="rounded-full border border-border px-3 py-1 text-xs">
                <code>{category.slug}</code>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section aria-labelledby="import-upload" className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-5">
        <h2 id="import-upload" className="text-lg font-bold">
          {t("uploadTitle")}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="import-file" className="sr-only">
            {t("fileLabel")}
          </label>
          <input
            id="import-file"
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setPreview(null);
              setResult(null);
            }}
            className="text-sm file:me-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-2"
          />
          <Button onClick={check} disabled={!file || pending}>
            {pending && !ready ? t("checking") : t("check")}
          </Button>
        </div>
      </section>

      {preview && "error" in preview && (
        <p role="alert" className="rounded-lg border border-danger px-4 py-3 text-danger">
          {t(`fileErrors.${preview.error}`)}
        </p>
      )}

      {ready && (
        <section aria-labelledby="import-preview" className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5" data-import-preview>
          <h2 id="import-preview" className="text-lg font-bold">
            {t("previewTitle")}
          </h2>

          <dl className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-surface p-3" data-count="created">
              <dt className="text-sm text-muted">{t("summary.created")}</dt>
              <dd className="text-2xl font-bold">{ready.created}</dd>
            </div>
            <div className="rounded-xl bg-surface p-3" data-count="updated">
              <dt className="text-sm text-muted">{t("summary.updated")}</dt>
              <dd className="text-2xl font-bold">{ready.updated}</dd>
            </div>
            <div className="rounded-xl bg-surface p-3" data-count="invalid">
              <dt className="text-sm text-muted">{t("summary.invalid")}</dt>
              <dd className={`text-2xl font-bold ${ready.invalid > 0 ? "text-danger" : ""}`}>{ready.invalid}</dd>
            </div>
          </dl>

          {ready.tooManyRows && <p role="alert" className="text-danger">{t("tooManyRows")}</p>}
          {ready.missingRequiredColumns.length > 0 && (
            <p className="text-sm">
              {t("missingColumns", { columns: ready.missingRequiredColumns.join(", ") })}
            </p>
          )}
          {ready.unknownColumns.length > 0 && (
            <p className="text-sm text-muted">{t("unknownColumns", { columns: ready.unknownColumns.join(", ") })}</p>
          )}
          {ready.newBrands.length > 0 && (
            <p className="text-sm text-muted">{t("newBrands", { brands: ready.newBrands.join(", ") })}</p>
          )}

          <div className="max-h-96 overflow-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface text-start">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">{t("table.line")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("table.product")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("table.action")}</th>
                  <th className="px-3 py-2 text-start font-medium">{t("table.problems")}</th>
                </tr>
              </thead>
              <tbody>
                {ready.rows.map((row) => (
                  <tr key={row.line} className="border-t border-border align-top" data-row-status={row.errors.length > 0 ? "error" : row.kind}>
                    <td className="px-3 py-2">{row.line}</td>
                    <td className="px-3 py-2">
                      <div>{row.label}</div>
                      <div className="text-xs text-muted" dir="ltr">
                        {row.slug}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {row.errors.length > 0 ? (
                        <span className="text-danger">{t("table.skipped")}</span>
                      ) : (
                        t(`table.${row.kind}`)
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.errors.length === 0 ? (
                        "—"
                      ) : (
                        <ul className="space-y-0.5 text-danger">
                          {row.errors.map((error) => (
                            <li key={`${error.column}-${error.code}`}>
                              {t(`columns.${error.column}`)}: {t(`errors.${error.code}`)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={run} disabled={importable === 0 || pending}>
              {pending ? t("importing") : t("import", { count: importable })}
            </Button>
            {ready.invalid > 0 && <p className="text-sm text-muted">{t("invalidSkipped")}</p>}
          </div>
        </section>
      )}

      {result && "error" in result && (
        <p role="alert" className="rounded-lg border border-danger px-4 py-3 text-danger">
          {result.error === "failed" && result.saved
            ? t("partialFailure", { saved: result.saved })
            : result.error === "nothing_to_import"
              ? t("nothingToImport")
              : result.error === "failed"
                ? t("importFailed")
                : t(`fileErrors.${result.error}`)}
        </p>
      )}

      {result && !("error" in result) && (
        <section role="status" className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-5" data-import-done>
          <h2 className="text-lg font-bold">{t("doneTitle")}</h2>
          <p>{t("doneSummary", { created: result.created, updated: result.updated, skipped: result.skipped })}</p>
          {result.created > 0 && <p className="text-sm text-muted">{t("doneHidden")}</p>}
          <Link href="/admin/products" className={buttonClass("primary")}>
            {t("viewProducts")}
          </Link>
        </section>
      )}
    </div>
  );
}
