import { useTranslations } from "next-intl";
import { isKnownSpecKey } from "@/config/specs";
import type { Locale } from "@/config/i18n";
import { pickLocalized } from "@/lib/format";

type Spec = { spec_key: string; value_ar: string | null; value_en: string | null; display_order: number };

/** Specification table; known keys are translated, custom keys show as typed. */
export function SpecsTable({ specs, locale }: { specs: Spec[]; locale: Locale }) {
  const tSpecs = useTranslations("specs");
  const t = useTranslations("store.product");
  if (specs.length === 0) return null;

  const rows = [...specs].sort((a, b) => a.display_order - b.display_order);

  return (
    <section aria-labelledby="specs-title" className="flex flex-col gap-3">
      <h2 id="specs-title" className="text-xl font-bold">
        {t("specs")}
      </h2>
      <table className="w-full overflow-hidden rounded-xl border border-border bg-background text-sm">
        <tbody>
          {rows.map((spec) => (
            <tr key={spec.spec_key} className="border-b border-border last:border-0">
              <th scope="row" className="w-2/5 bg-surface px-4 py-2.5 text-start font-medium">
                {isKnownSpecKey(spec.spec_key) ? tSpecs(spec.spec_key) : spec.spec_key}
              </th>
              <td className="px-4 py-2.5">{pickLocalized(locale, spec.value_ar, spec.value_en) || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
