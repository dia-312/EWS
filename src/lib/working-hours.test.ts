import { describe, expect, it } from "vitest";
import {
  hasWorkingHours,
  isOpenNow,
  parseWorkingHours,
  type WorkingHours,
} from "./working-hours";

const TZ = "Asia/Hebron"; // UTC+2 in January

const hours: WorkingHours = {
  sat: [{ open: "09:00", close: "21:00" }],
  sun: [
    { open: "09:00", close: "13:00" },
    { open: "16:00", close: "21:00" },
  ],
  mon: [{ open: "18:00", close: "02:00" }], // runs past midnight into Tuesday
  fri: [],
};

// 2026-01-10 is a Saturday.
const at = (iso: string) => new Date(iso);

describe("isOpenNow", () => {
  it("is open inside an interval and closed outside it, in the store's time zone", () => {
    expect(isOpenNow(hours, TZ, at("2026-01-10T07:30:00Z"))).toBe(true); // Sat 09:30 local
    expect(isOpenNow(hours, TZ, at("2026-01-10T06:30:00Z"))).toBe(false); // Sat 08:30 local
    expect(isOpenNow(hours, TZ, at("2026-01-10T19:00:00Z"))).toBe(false); // Sat 21:00 local (closing time)
  });

  it("supports a break between two intervals", () => {
    expect(isOpenNow(hours, TZ, at("2026-01-11T09:00:00Z"))).toBe(true); // Sun 11:00 local
    expect(isOpenNow(hours, TZ, at("2026-01-11T11:30:00Z"))).toBe(false); // Sun 13:30 local, break
    expect(isOpenNow(hours, TZ, at("2026-01-11T14:30:00Z"))).toBe(true); // Sun 16:30 local
  });

  it("handles closed days and days without hours", () => {
    expect(isOpenNow(hours, TZ, at("2026-01-16T10:00:00Z"))).toBe(false); // Fri, empty list
    expect(isOpenNow(hours, TZ, at("2026-01-14T10:00:00Z"))).toBe(false); // Wed, undefined
  });

  it("handles intervals that run past midnight", () => {
    expect(isOpenNow(hours, TZ, at("2026-01-12T17:00:00Z"))).toBe(true); // Mon 19:00
    expect(isOpenNow(hours, TZ, at("2026-01-12T23:30:00Z"))).toBe(true); // Tue 01:30, still Monday's shift
    expect(isOpenNow(hours, TZ, at("2026-01-13T00:30:00Z"))).toBe(false); // Tue 02:30
  });
});

describe("parseWorkingHours", () => {
  it("keeps valid intervals and drops malformed ones", () => {
    const parsed = parseWorkingHours({
      sat: [{ open: "09:00", close: "21:00" }, { open: "25:00", close: "26:00" }, "x"],
      sun: "closed",
      mon: [
        { open: "08:00", close: "10:00" },
        { open: "11:00", close: "12:00" },
        { open: "13:00", close: "14:00" },
      ],
      holiday: [{ open: "09:00", close: "10:00" }],
    });
    expect(parsed.sat).toEqual([{ open: "09:00", close: "21:00" }]);
    expect(parsed.sun).toBeUndefined();
    expect(parsed.mon).toHaveLength(2);
    expect("holiday" in parsed).toBe(false);
  });

  it("returns an empty schedule for non-objects", () => {
    expect(parseWorkingHours(null)).toEqual({});
    expect(parseWorkingHours("nope")).toEqual({});
  });
});

describe("hasWorkingHours", () => {
  it("is false when no day has an interval", () => {
    expect(hasWorkingHours({})).toBe(false);
    expect(hasWorkingHours({ sat: [] })).toBe(false);
    expect(hasWorkingHours({ sat: [{ open: "09:00", close: "10:00" }] })).toBe(true);
  });
});
