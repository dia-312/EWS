import { readableForeground } from "@/lib/color";
import { isPwaIconName, PWA_ICONS, renderIconPng } from "@/lib/pwa-icon";
import { getStoreTheme } from "@/lib/theme";

export const dynamic = "force-dynamic";

/**
 * The app icon in the store's primary color (home screen, install prompt).
 *
 *   GET /pwa-icon/192 | 512 | maskable-512 | apple-180
 */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!isPwaIconName(name)) return new Response("Not found", { status: 404 });

  const { size, maskable } = PWA_ICONS[name];
  const { primary } = (await getStoreTheme()).colors;
  const png = renderIconPng(size, primary, readableForeground(primary), maskable);

  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300, s-maxage=300" },
  });
}
