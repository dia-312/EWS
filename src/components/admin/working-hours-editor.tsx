"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DAYS, type Day, type WorkingHours } from "@/lib/working-hours";

const timeClass =
  "w-full rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40";

/**
 * One row per weekday: a "closed" switch and up to two opening intervals (for
 * example a lunch break). Inputs submit as hours_<day>_open1/close1/open2/close2.
 */
export function WorkingHoursEditor({
  initial,
  error,
}: {
  initial: WorkingHours;
  error?: string;
}) {
  const t = useTranslations("admin.settings.hours");
  const tDays = useTranslations("admin.settings.days");
  const [closed, setClosed] = useState<Record<Day, boolean>>(
    () =>
      Object.fromEntries(DAYS.map((day) => [day, (initial[day]?.length ?? 0) === 0])) as Record<
        Day,
        boolean
      >,
  );

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-base font-bold">{t("title")}</legend>
      <p className="text-sm text-muted">{t("hint")}</p>

      <ul className="flex flex-col gap-2">
        {DAYS.map((day) => {
          const intervals = initial[day] ?? [];
          const isClosed = closed[day];

          return (
            <li
              key={day}
              className="grid gap-3 rounded-xl border border-border bg-surface p-3 sm:grid-cols-[8rem_auto_1fr] sm:items-center"
            >
              <span className="font-medium">{tDays(day)}</span>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={`hours_${day}_closed`}
                  checked={isClosed}
                  onChange={(event) =>
                    setClosed((current) => ({ ...current, [day]: event.target.checked }))
                  }
                  className="size-4 accent-primary"
                />
                {t("closed")}
              </label>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" dir="ltr">
                {[1, 2].map((slot) => {
                  const interval = intervals[slot - 1];
                  return (
                    <div key={slot} className="contents">
                      <input
                        type="time"
                        name={`hours_${day}_open${slot}`}
                        defaultValue={interval?.open ?? ""}
                        disabled={isClosed}
                        aria-label={`${tDays(day)} - ${t("open")} ${slot}`}
                        className={timeClass}
                      />
                      <input
                        type="time"
                        name={`hours_${day}_close${slot}`}
                        defaultValue={interval?.close ?? ""}
                        disabled={isClosed}
                        aria-label={`${tDays(day)} - ${t("close")} ${slot}`}
                        className={timeClass}
                      />
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
