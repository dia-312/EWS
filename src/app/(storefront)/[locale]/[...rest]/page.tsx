import { notFound } from "next/navigation";

/**
 * Any address that no page matches (for example /en/old-link) lands here so the
 * visitor sees the store's own "page not found" inside its header and footer,
 * instead of a bare browser-style 404.
 */
export default function UnknownPage() {
  notFound();
}
