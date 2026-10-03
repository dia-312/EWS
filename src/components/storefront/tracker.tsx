"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";
import { track } from "@/lib/track";

/** One page view per page the visitor opens. */
export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    track({ type: "page_view" });
  }, [pathname]);
  return null;
}

/** Counts a product page view, and a QR scan when the link came from a QR code (?src=qr). */
export function TrackProductView({ productId }: { productId: string }) {
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (sent.current === productId) return;
    sent.current = productId;
    track({ type: "product_view", productId });
    if (new URLSearchParams(window.location.search).get("src") === "qr") {
      track({ type: "qr_scan", productId });
    }
  }, [productId]);
  return null;
}

/** Counts a search once per search text. */
export function TrackSearch({ query }: { query: string }) {
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (sent.current === query) return;
    sent.current = query;
    track({ type: "search", query });
  }, [query]);
  return null;
}

/** Counts clicks on WhatsApp / call buttons anywhere on the page (they carry data-contact). */
export function ContactClickTracker() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest?.("[data-contact]");
      if (!link) return;
      const type = link.getAttribute("data-contact") === "phone" ? "phone_click" : "whatsapp_click";
      track({ type, productId: link.getAttribute("data-product") ?? undefined });
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
