import { useTranslations } from "next-intl";
import { CallButton, WhatsAppButton } from "@/components/storefront/contact-buttons";
import { InstallButton } from "@/components/storefront/pwa";
import { OpenNowBadge } from "@/components/storefront/open-now";
import { DEVELOPER } from "@/config/credit";
import type { Locale } from "@/config/i18n";
import { Link } from "@/i18n/navigation";
import type { StoreSettings } from "@/lib/catalog";
import { pickLocalized } from "@/lib/format";
import { DAYS, parseWorkingHours } from "@/lib/working-hours";

type FooterProps = {
  locale: Locale;
  store: { name: string; timezone: string };
  settings: StoreSettings | null;
};

export function Footer({ locale, store, settings }: FooterProps) {
  const t = useTranslations("store.footer");
  const tDays = useTranslations("store.days");
  const hours = parseWorkingHours(settings?.working_hours);
  const about = pickLocalized(locale, settings?.about_text_ar, settings?.about_text_en);
  const address = pickLocalized(locale, settings?.address_ar, settings?.address_en);
  const hasHours = DAYS.some((day) => (hours[day]?.length ?? 0) > 0);

  return (
    <footer className="mt-12 border-t border-border bg-background">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-3">
        <section aria-labelledby="footer-about">
          <h2 id="footer-about" className="text-lg font-bold">
            {store.name}
          </h2>
          {about && <p className="mt-2 text-sm text-muted">{about}</p>}
        </section>

        <section aria-labelledby="footer-contact" id="contact" className="flex flex-col gap-3">
          <h2 id="footer-contact" className="text-lg font-bold">
            {t("contact")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {settings?.whatsapp && <WhatsAppButton number={settings.whatsapp} />}
            {settings?.phone && <CallButton phone={settings.phone} />}
          </div>
          {settings?.phone && (
            <p className="text-sm" dir="ltr">
              {settings.phone}
            </p>
          )}
          {address && <p className="text-sm">{address}</p>}
          {settings?.map_url && (
            <a
              href={settings.map_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline underline-offset-2"
            >
              {t("map")}
            </a>
          )}
          <InstallButton />
          <ul className="flex gap-4 text-sm">
            {settings?.instagram_url && (
              <li>
                <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  Instagram
                </a>
              </li>
            )}
            {settings?.facebook_url && (
              <li>
                <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  Facebook
                </a>
              </li>
            )}
          </ul>
        </section>

        <section aria-labelledby="footer-hours" className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h2 id="footer-hours" className="text-lg font-bold">
              {t("hours")}
            </h2>
            <OpenNowBadge hours={hours} timeZone={store.timezone} />
          </div>
          {hasHours ? (
            <table className="text-sm">
              <tbody>
                {DAYS.map((day) => {
                  const intervals = hours[day] ?? [];
                  return (
                    <tr key={day}>
                      <th scope="row" className="py-0.5 pe-4 text-start font-normal text-muted">
                        {tDays(day)}
                      </th>
                      <td className="py-0.5" dir="ltr">
                        {intervals.length === 0
                          ? t("closed")
                          : intervals.map(({ open, close }) => `${open} - ${close}`).join("  ·  ")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted">{t("noHours")}</p>
          )}
        </section>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted">
          <p>{t("copyright", { year: new Date().getFullYear(), name: store.name })}</p>
          <Link href="/products" className="underline underline-offset-2">
            {t("browse")}
          </Link>
        </div>
        {/* The developer's credit: deliberately apart from the shop's own line, and not a shop contact button */}
        <p className="mx-auto max-w-7xl px-4 pb-4 text-center text-[11px] text-muted" data-developer-credit>
          {t("developedBy", { name: locale === "ar" ? DEVELOPER.nameAr : DEVELOPER.nameEn })}
          {" · "}
          <a href={DEVELOPER.phoneHref} dir="ltr" className="underline underline-offset-2">
            {DEVELOPER.phoneDisplay}
          </a>
        </p>
      </div>
    </footer>
  );
}
