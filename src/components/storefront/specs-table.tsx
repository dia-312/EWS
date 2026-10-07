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
    <section aria-labelledby="specs-title" className="flex flex-col gap-4">
      <h2 id="specs-title" className="section-title">
        {t("specs")}
      </h2>
      <table className="w-full overflow-hidden rounded-2xl border border-border/80 bg-background text-sm shadow-card">
        <tbody>
          {rows.map((spec) => (
            <tr key={spec.spec_key} className="border-b border-border/70 last:border-0 odd:bg-surface/50">
              <th scope="row" className="w-2/5 px-5 py-3 text-start font-semibold text-muted">
                {isKnownSpecKey(spec.spec_key) ? tSpecs(spec.spec_key) : spec.spec_key}
              </th>
              <td className="px-5 py-3 font-medium">{pickLocalized(locale, spec.value_ar, spec.value_en) || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
