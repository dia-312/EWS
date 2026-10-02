import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { telUrl, whatsappUrl } from "@/lib/contact";

type WhatsAppButtonProps = {
  number: string;
  message?: string;
  label?: string;
  className?: string;
  variant?: "primary" | "secondary";
};

/** Opens a WhatsApp chat, optionally with a message about a product. */
export function WhatsAppButton({
  number,
  message,
  label,
  className,
  variant = "primary",
}: WhatsAppButtonProps) {
  const t = useTranslations("store.contact");
  return (
    <a
      href={whatsappUrl(number, message)}
      target="_blank"
      rel="noopener noreferrer"
      data-contact="whatsapp"
      className={cn(buttonClass(variant), className)}
    >
      {label ?? t("whatsapp")}
    </a>
  );
}

export function CallButton({
  phone,
  className,
  variant = "secondary",
}: {
  phone: string;
  className?: string;
  variant?: "primary" | "secondary";
}) {
  const t = useTranslations("store.contact");
  return (
    <a
      href={telUrl(phone)}
      data-contact="phone"
      className={cn(buttonClass(variant), className)}
    >
      {t("call")}
    </a>
  );
}
