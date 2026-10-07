import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function StorefrontNotFound() {
  const t = useTranslations("store.notFound");
  const tNav = useTranslations("store.nav");

  return (
    <div className="relative isolate mx-auto flex max-w-2xl flex-col items-center gap-3 overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-background to-primary-soft px-6 py-16 text-center shadow-card">
      <span aria-hidden className="absolute -top-24 start-1/2 -z-10 size-72 -translate-x-1/2 rounded-full bg-primary opacity-15 blur-3xl" />
      <p
        aria-hidden
        dir="ltr"
        className="bg-gradient-to-br from-primary to-accent bg-clip-text text-8xl font-extrabold leading-none text-transparent sm:text-9xl"
      >
        404
      </p>
      <h1 className="text-2xl font-extrabold sm:text-3xl">{t("title")}</h1>
      <p className="max-w-md text-muted">{t("body")}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
        <Link href="/" className={`${buttonClass("primary")} rounded-pill px-7 py-3 shadow-glow`}>
          {t("home")}
        </Link>
        <Link href="/products" className={`${buttonClass("secondary")} rounded-pill px-7 py-3`}>
          {tNav("allProducts")}
        </Link>
      </div>
    </div>
  );
}
