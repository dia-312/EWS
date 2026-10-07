"use client";

import { useTranslations } from "next-intl";
import { CompareIcon, HeartIcon } from "@/components/storefront/icons";
import { cn } from "@/lib/cn";
import { useShopStore } from "@/lib/shop-store";
import { track } from "@/lib/track";

type ShopButtonProps = {
  productId: string;
  productName: string;
  /** "icon": round button for cards. "full": icon with a text label for the product page. */
  variant?: "icon" | "full";
  className?: string;
};

const baseButton =
  "inline-flex items-center justify-center gap-2 rounded-full border font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function FavoriteButton({ productId, productName, variant = "icon", className }: ShopButtonProps) {
  const t = useTranslations("store.shop");
  const saved = useShopStore((state) => state.hydrated && state.favorites.includes(productId));
  const toggle = useShopStore((state) => state.toggleFavorite);
  const announce = useShopStore((state) => state.announce);

  const label = saved ? t("removeFavorite", { name: productName }) : t("addFavorite", { name: productName });

  return (
    <>
      <button
        type="button"
        aria-pressed={saved}
        aria-label={variant === "icon" ? label : undefined}
        title={variant === "icon" ? label : undefined}
        data-favorite={saved ? "on" : "off"}
        onClick={() => {
          const result = toggle(productId);
          if (result === "added") track({ type: "favorite_add", productId });
          announce(result === "added" ? t("addedFavorite") : t("removedFavorite"));
        }}
        className={cn(
          baseButton,
          saved ? "border-danger bg-danger/10 text-danger shadow-card backdrop-blur" : "border-border/70 bg-glass text-foreground shadow-card backdrop-blur hover:bg-background",
          variant === "icon" ? "size-9" : "px-4 py-2 text-sm",
          className,
        )}
      >
        <HeartIcon filled={saved} className={variant === "icon" ? "size-5" : "size-4"} />
        {variant === "full" && <span>{saved ? t("saved") : t("save")}</span>}
      </button>
    </>
  );
}

export function CompareButton({ productId, productName, variant = "icon", className }: ShopButtonProps) {
  const t = useTranslations("store.shop");
  const selected = useShopStore((state) => state.hydrated && state.compare.includes(productId));
  const toggle = useShopStore((state) => state.toggleCompare);
  const announce = useShopStore((state) => state.announce);
  const showNotice = useShopStore((state) => state.showNotice);

  const label = selected ? t("removeCompare", { name: productName }) : t("addCompare", { name: productName });

  return (
    <>
      <button
        type="button"
        aria-pressed={selected}
        aria-label={variant === "icon" ? label : undefined}
        title={variant === "icon" ? label : undefined}
        data-compare={selected ? "on" : "off"}
        onClick={() => {
          const result = toggle(productId);
          if (result === "added") track({ type: "compare_add", productId });
          if (result === "full") showNotice("compare_full");
          // A full list is shown by the visible alert; only successes are announced here.
          if (result !== "full") announce(result === "added" ? t("addedCompare") : t("removedCompare"));
        }}
        className={cn(
          baseButton,
          selected ? "border-primary bg-primary-soft text-primary shadow-card backdrop-blur" : "border-border/70 bg-glass text-foreground shadow-card backdrop-blur hover:bg-background",
          variant === "icon" ? "size-9" : "px-4 py-2 text-sm",
          className,
        )}
      >
        <CompareIcon filled={selected} className={variant === "icon" ? "size-5" : "size-4"} />
        {variant === "full" && <span>{selected ? t("inCompare") : t("compare")}</span>}
      </button>
    </>
  );
}
