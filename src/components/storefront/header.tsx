import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { FavoritesLink } from "@/components/storefront/favorites-link";
import { LanguageSwitcher } from "@/components/storefront/language-switcher";
import { NavLinks } from "@/components/storefront/nav-links";
import { SearchForm } from "@/components/storefront/search-form";
import { WhatsAppButton } from "@/components/storefront/contact-buttons";
import type { Locale } from "@/config/i18n";
import { Link } from "@/i18n/navigation";
import type { Category } from "@/lib/catalog";
import { pickLocalized } from "@/lib/format";

type HeaderProps = {
  locale: Locale;
  store: { name: string; logo_url: string | null };
  categories: Category[];
  whatsapp: string | null;
};

export function Header({ locale, store, categories, whatsapp }: HeaderProps) {
  const t = useTranslations("store.nav");

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-glass shadow-[0_1px_0_rgb(0_0_0/0.02)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5 rounded-xl focus-visible:outline-2 focus-visible:outline-primary">
          {store.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logo_url} alt="" width={44} height={44} className="size-11 rounded-xl object-contain" />
          ) : (
            <span
              aria-hidden
              className="flex size-10 items-center justify-center rounded-xl bg-primary text-lg font-extrabold text-primary-foreground shadow-glow"
            >
              {store.name.trim().slice(0, 1)}
            </span>
          )}
          <span className="text-lg font-extrabold">{store.name}</span>
        </Link>

        <div className="order-3 w-full md:order-none md:max-w-xl md:flex-1">
          <SearchForm locale={locale} />
        </div>

        <div className="ms-auto flex items-center gap-2">
          <FavoritesLink />
          <Suspense fallback={null}>
            <LanguageSwitcher />
          </Suspense>
          {whatsapp && (
            <WhatsAppButton number={whatsapp} className="hidden rounded-pill px-4 py-2 text-sm shadow-glow sm:inline-flex" />
          )}
        </div>
      </div>

      <nav aria-label={t("label")} className="border-t border-border/60">
        <NavLinks
          items={[
            { href: "/", label: t("home"), match: "exact" },
            { href: "/products", label: t("allProducts"), match: "exact" },
            { href: "/products?sale=1", label: t("offers") },
            ...categories.map((category) => ({
              href: `/categories/${category.slug}`,
              label: pickLocalized(locale, category.name_ar, category.name_en),
            })),
          ]}
        />
      </nav>
    </header>
  );
}
