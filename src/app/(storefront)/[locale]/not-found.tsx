import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/storefront/empty-state";
import { buttonClass } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function StorefrontNotFound() {
  const t = useTranslations("store.notFound");

  return (
    <EmptyState title={t("title")} body={t("body")}>
      <Link href="/" className={buttonClass("primary")}>
        {t("home")}
      </Link>
    </EmptyState>
  );
}
