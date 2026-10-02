"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { isKnownSpecKey, KNOWN_SPEC_KEYS } from "@/config/specs";

export type SpecRowValue = {
  spec_key: string;
  value_ar: string | null;
  value_en: string | null;
};

type Row = { id: number; key: string; valueAr: string; valueEn: string };

const CUSTOM = "__custom__";
const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";

/**
 * Editable list of specifications. Every row submits spec_key, spec_value_ar and
 * spec_value_en once, in order, which the server zips back into rows. A key can
 * be one of the known specs (translated label) or a custom text.
 */
export function SpecEditor({
  initial,
  error,
}: {
  initial: SpecRowValue[];
  error?: string;
}) {
  const t = useTranslations("admin.products.form.specs");
  const tSpecs = useTranslations("specs");
  const [nextId, setNextId] = useState(initial.length);
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((spec, index) => ({
      id: index,
      key: spec.spec_key,
      valueAr: spec.value_ar ?? "",
      valueEn: spec.value_en ?? "",
    })),
  );
  // Rows whose key is not one of the known specs start in custom mode.
  const [customRows, setCustomRows] = useState<Set<number>>(
    () =>
      new Set(
        initial
          .map((spec, index) => (isKnownSpecKey(spec.spec_key) ? -1 : index))
          .filter((index) => index >= 0),
      ),
  );

  function update(id: number, patch: Partial<Row>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  function addRow() {
    setRows((current) => [
      ...current,
      { id: nextId, key: KNOWN_SPEC_KEYS[0], valueAr: "", valueEn: "" },
    ]);
    setNextId((value) => value + 1);
  }

  function removeRow(id: number) {
    setRows((current) => current.filter((row) => row.id !== id));
    setCustomRows((current) => {
      const copy = new Set(current);
      copy.delete(id);
      return copy;
    });
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-base font-bold">{t("title")}</legend>
      <p className="text-sm text-muted">{t("hint")}</p>

      {rows.length === 0 && <p className="text-sm text-muted">{t("empty")}</p>}

      <ul className="flex flex-col gap-3">
        {rows.map((row, index) => {
          const custom = customRows.has(row.id);
          return (
            <li
              key={row.id}
              className="grid gap-2 rounded-xl border border-border bg-surface p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" htmlFor={`spec-key-${row.id}`}>
                  {t("key")}
                </label>
                {custom ? (
                  <input
                    id={`spec-key-${row.id}`}
                    name="spec_key"
                    value={row.key}
                    onChange={(event) => update(row.id, { key: event.target.value })}
                    placeholder={t("customKey")}
                    className={inputClass}
                  />
                ) : (
                  <select
                    id={`spec-key-${row.id}`}
                    name="spec_key"
                    value={row.key}
                    onChange={(event) => {
                      if (event.target.value === CUSTOM) {
                        setCustomRows((current) => new Set(current).add(row.id));
                        update(row.id, { key: "" });
                      } else {
                        update(row.id, { key: event.target.value });
                      }
                    }}
                    className={inputClass}
                  >
                    {KNOWN_SPEC_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {tSpecs(key)}
                      </option>
                    ))}
                    <option value={CUSTOM}>{t("custom")}</option>
                  </select>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" htmlFor={`spec-ar-${row.id}`}>
                  {t("valueAr")}
                </label>
                <input
                  id={`spec-ar-${row.id}`}
                  name="spec_value_ar"
                  value={row.valueAr}
                  onChange={(event) => update(row.id, { valueAr: event.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" htmlFor={`spec-en-${row.id}`}>
                  {t("valueEn")}
                </label>
                <input
                  id={`spec-en-${row.id}`}
                  name="spec_value_en"
                  dir="ltr"
                  value={row.valueEn}
                  onChange={(event) => update(row.id, { valueEn: event.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger"
                  onClick={() => removeRow(row.id)}
                  aria-label={`${t("remove")} (${index + 1})`}
                >
                  {t("remove")}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div>
        <Button variant="secondary" size="sm" onClick={addRow}>
          {t("add")}
        </Button>
      </div>
    </fieldset>
  );
}
