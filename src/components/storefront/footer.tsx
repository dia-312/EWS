import { useTranslations } from "next-intl";
import { CallButton, WhatsAppButton } from "@/components/storefront/contact-buttons";
import { OpenNowBadge } from "@/components/storefront/open-now";
import { InstallButton } from "@/components/storefront/pwa";
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

const linkClass = "underline underline-offset-4 decoration-current/40 transition-colors hover:decoration-current focus-visible:outline-2 focus-visible:outline-current";

export function Footer({ locale, store, settings }: FooterProps) {
  const t = useTranslations("store.footer");
  const tDays = useTranslations("store.days");
  const hours = parseWorkingHours(settings?.working_hours);
  const about = pickLocalized(locale, settings?.about_text_ar, settings?.about_text_en);
  const address = pickLocalized(locale, settings?.address_ar, settings?.address_en);
  const hasHours = DAYS.some((day) => (hours[day]?.length ?? 0) > 0);

  return (
    <footer className="relative isolate mt-20 overflow-hidden bg-secondary text-secondary-foreground">
      <span aria-hidden className="dots absolute inset-0 -z-10 opacity-40" />
      <span aria-hidden className="absolute -start-24 -top-32 -z-10 size-80 rounded-full bg-primary opacity-30 blur-3xl" />

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-3">
        <section aria-labelledby="footer-about" className="flex flex-col gap-3">
          <h2 id="footer-about" className="text-xl font-extrabold">
            {store.name}
          </h2>
          {about && <p className="max-w-sm text-sm leading-relaxed opacity-80">{about}</p>}
        </section>

        <section aria-labelledby="footer-contact" id="contact" className="flex flex-col gap-3.5">
          <h2 id="footer-contact" className="text-lg font-bold">
            {t("contact")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {settings?.whatsapp && <WhatsAppButton number={settings.whatsapp} className="rounded-pill ring-1 ring-white/25" />}
            {settings?.phone && <CallButton phone={settings.phone} className="rounded-pill" />}
          </div>
          {settings?.phone && (
            <p className="text-sm opacity-90" dir="ltr">
              {settings.phone}
            </p>
          )}
          {address && <p className="text-sm opacity-90">{address}</p>}
          {settings?.map_url && (
            <a href={settings.map_url} target="_blank" rel="noopener noreferrer" className={`text-sm ${linkClass}`}>
              {t("map")}
            </a>
          )}
          <InstallButton />
          <ul className="flex gap-4 text-sm">
            {settings?.instagram_url && (
              <li>
                <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  Instagram
                </a>
              </li>
            )}
            {settings?.facebook_url && (
              <li>
                <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  Facebook
                </a>
              </li>
            )}
          </ul>
        </section>

        <section aria-labelledby="footer-hours" className="flex flex-col gap-3">
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
                    <tr key={day} className="border-b border-current/10 last:border-0">
                      <th scope="row" className="py-1.5 pe-6 text-start font-normal opacity-75">
                        {tDays(day)}
                      </th>
                      <td className="py-1.5" dir="ltr">
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
            <p className="text-sm opacity-75">{t("noHours")}</p>
          )}
        </section>
      </div>

      <div className="border-t border-current/15">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs opacity-80">
          <p>{t("copyright", { year: new Date().getFullYear(), name: store.name })}</p>
          <Link href="/products" className={linkClass}>
            {t("browse")}
          </Link>
        </div>
        {/* The developer's credit: deliberately apart from the shop's own line, and not a shop contact button */}
        <p className="mx-auto max-w-7xl px-4 pb-5 text-center text-[11px] opacity-70" data-developer-credit>
          {t("developedBy", { name: locale === "ar" ? DEVELOPER.nameAr : DEVELOPER.nameEn })}
          {" · "}
          <a href={DEVELOPER.phoneHref} dir="ltr" className={linkClass}>
            {DEVELOPER.phoneDisplay}
          </a>
        </p>
      </div>
    </footer>
  );
}
