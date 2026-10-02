/**
 * The admin types dates as the store's wall-clock time ("2026-07-15T10:00" means
 * 10:00 in Asia/Hebron), while the database stores UTC instants. These helpers
 * convert between the two, including daylight saving changes.
 */

const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Offset of `timeZone` from UTC at the given instant, in milliseconds. */
function offsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** "YYYY-MM-DDTHH:mm" in `timeZone` -> the matching UTC instant, or null if malformed. */
export function zonedTimeToUtc(local: string, timeZone: string): Date | null {
  const match = LOCAL_DATE_TIME.exec(local.trim());
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);

  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(guess);
  // Reject impossible dates such as February 31st.
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day || hour > 23 || minute > 59) return null;

  const first = guess - offsetMs(guess, timeZone);
  const second = guess - offsetMs(first, timeZone);
  return new Date(second);
}

/** A UTC instant -> "YYYY-MM-DDTHH:mm" in `timeZone`, ready for <input type="datetime-local">. */
export function utcToZonedInput(instant: string | Date, timeZone: string): string {
  const time = new Date(instant).getTime();
  const shifted = new Date(time + offsetMs(time, timeZone));
  return shifted.toISOString().slice(0, 16);
}
