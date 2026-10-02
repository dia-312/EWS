"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/** Splits a number of milliseconds into days, hours, minutes and seconds. */
export function splitDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
}

/** Counts down to the end of an offer; renders nothing once it has ended. */
export function OfferCountdown({ endsAt }: { endsAt: string }) {
  const t = useTranslations("store.offer");
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const end = new Date(endsAt).getTime();
    const tick = () => setRemaining(end - Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  if (remaining === null || remaining <= 0) return null;
  const { days, hours, minutes, seconds } = splitDuration(remaining);
  const pad = (value: number) => String(value).padStart(2, "0");

  return (
    <p className="text-sm font-medium text-danger">
      <span>{t("endsIn")} </span>
      <time dateTime={endsAt} dir="ltr" className="font-mono tabular-nums">
        {days > 0 ? `${days}d ` : ""}
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </time>
    </p>
  );
}
