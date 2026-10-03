import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { FavoritesLink } from "@/components/storefront/favorites-link";
import { LanguageSwitcher } from "@/components/storefront/language-switcher";
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
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-primary">
          {store.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logo_url} alt="" width={40} height={40} className="size-10 rounded-lg object-contain" />
          )}
          <span className="text-lg font-bold">{store.name}</span>
        </Link>

        <div className="order-3 w-full md:order-none md:max-w-xl md:flex-1">
          <SearchForm locale={locale} />
        </div>

        <div className="ms-auto flex items-center gap-2">
          <FavoritesLink />
          <Suspense fallback={null}>
            <LanguageSwitcher />
          </Suspense>
          {whatsapp && <WhatsAppButton number={whatsapp} className="hidden px-3 py-1.5 text-sm sm:inline-flex" />}
        </div>
      </div>

      <nav aria-label={t("label")} className="border-t border-border">
        <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 text-sm">
          <NavLink href="/">{t("home")}</NavLink>
          <NavLink href="/products">{t("allProducts")}</NavLink>
          <NavLink href="/products?sale=1">{t("offers")}</NavLink>
          {categories.map((category) => (
            <NavLink key={category.id} href={`/categories/${category.slug}`}>
              {pickLocalized(locale, category.name_ar, category.name_en)}
            </NavLink>
          ))}
        </ul>
      </nav>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li className="shrink-0">
      <Link
        href={href}
        className="block whitespace-nowrap px-3 py-2.5 text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
      >
        {children}
      </Link>
    </li>
  );
}
