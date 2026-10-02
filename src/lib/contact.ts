/** "+970 59 123 4567" -> "tel:+970591234567" (keeps only a leading + and digits). */
export function telUrl(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  return `tel:${cleaned}`;
}

/**
 * Link that opens a WhatsApp chat with a prefilled message. `number` is the
 * normalized digits-only international number stored in the settings.
 */
export function whatsappUrl(number: string, message?: string): string {
  const base = `https://wa.me/${number.replace(/\D/g, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
