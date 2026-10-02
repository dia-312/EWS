import { getStoreThemeStyle } from "@/lib/theme";

/** Public pages: wraps the site in the store's colors, radius and font. */
export default async function StorefrontLayout({ children }: LayoutProps<"/">) {
  const style = await getStoreThemeStyle();

  return (
    <div
      className="theme-root flex flex-1 flex-col bg-surface text-foreground"
      style={style}
    >
      {children}
    </div>
  );
}
