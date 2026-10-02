"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { hasWorkingHours, isOpenNow, type WorkingHours } from "@/lib/working-hours";

/**
 * "Open now" / "Closed now". Computed in the browser after load because the
 * answer depends on the current time, which a cached page cannot know.
 */
export function OpenNowBadge({
  hours,
  timeZone,
  className,
}: {
  hours: WorkingHours;
  timeZone: string;
  className?: string;
}) {
  const t = useTranslations("store.hours");
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const update = () => setOpen(isOpenNow(hours, timeZone));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [hours, timeZone]);

  if (!hasWorkingHours(hours) || open === null) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        open ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", open ? "bg-green-600" : "bg-red-600")} />
      {open ? t("openNow") : t("closedNow")}
    </span>
  );
}
