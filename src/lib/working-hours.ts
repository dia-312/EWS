/** Week starts on Saturday, as in the store's market. */
export const DAYS = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"] as const;
export type Day = (typeof DAYS)[number];

export type Interval = { open: string; close: string };
export type WorkingHours = Partial<Record<Day, Interval[]>>;

export const MAX_INTERVALS_PER_DAY = 2;

/** "HH:MM", 24-hour clock. */
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Reads the JSON stored in store_settings.working_hours, ignoring anything malformed. */
export function parseWorkingHours(value: unknown): WorkingHours {
  const result: WorkingHours = {};
  if (!value || typeof value !== "object") return result;

  for (const day of DAYS) {
    const raw = (value as Record<string, unknown>)[day];
    if (!Array.isArray(raw)) continue;

    result[day] = raw
      .filter(
        (item): item is Interval =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as Interval).open === "string" &&
          typeof (item as Interval).close === "string" &&
          TIME_PATTERN.test((item as Interval).open) &&
          TIME_PATTERN.test((item as Interval).close),
      )
      .slice(0, MAX_INTERVALS_PER_DAY);
  }
  return result;
}

/** True when at least one day has opening hours (otherwise there is nothing to show). */
export function hasWorkingHours(hours: WorkingHours): boolean {
  return DAYS.some((day) => (hours[day]?.length ?? 0) > 0);
}

const WEEKDAY_TO_DAY: Record<string, Day> = {
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
  Sun: "sun",
};

/** Weekday and minutes since midnight of `date` as seen in `timeZone`. */
function zonedNow(date: Date, timeZone: string): { day: Day; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    day: WEEKDAY_TO_DAY[get("weekday")],
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/**
 * Whether the store is open at `now`. An interval whose close is not after its
 * open (for example 18:00 to 02:00) runs past midnight into the next day.
 */
export function isOpenNow(hours: WorkingHours, timeZone: string, now: Date = new Date()): boolean {
  const { day, minutes } = zonedNow(now, timeZone);
  const previous = DAYS[(DAYS.indexOf(day) + DAYS.length - 1) % DAYS.length];

  const openToday = (hours[day] ?? []).some(({ open, close }) => {
    const start = toMinutes(open);
    const end = toMinutes(close);
    return end > start ? minutes >= start && minutes < end : minutes >= start;
  });

  const openFromYesterday = (hours[previous] ?? []).some(({ open, close }) => {
    const start = toMinutes(open);
    const end = toMinutes(close);
    return end <= start && minutes < end;
  });

  return openToday || openFromYesterday;
}
