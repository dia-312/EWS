/**
 * Where a product link can be sent when the browser has no built-in share
 * sheet. The link is always the canonical product address (no tracking).
 */
export type ShareTarget = { key: "whatsapp" | "facebook" | "telegram" | "email"; href: string };

export function shareTargets(url: string, text: string): ShareTarget[] {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${text} ${url}`);
  const subject = encodeURIComponent(text);

  return [
    { key: "whatsapp", href: `https://wa.me/?text=${encodedText}` },
    { key: "facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { key: "telegram", href: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(text)}` },
    { key: "email", href: `mailto:?subject=${subject}&body=${encodedText}` },
  ];
}

/** The address a QR code on a shelf label opens: the product page, marked as coming from a scan. */
export function withQrSource(productUrl: string): string {
  const url = new URL(productUrl);
  url.searchParams.set("src", "qr");
  return url.toString();
}
