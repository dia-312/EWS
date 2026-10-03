import { describe, expect, it } from "vitest";
import {
  compareHref,
  MAX_COMPARE,
  parseIdList,
  pruneIds,
  pushRecent,
  sanitizeSaved,
  toggleInList,
} from "./shop-state";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const D = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const E = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

describe("toggleInList", () => {
  it("adds a missing id and removes a present one", () => {
    expect(toggleInList([], A, 3)).toEqual({ list: [A], result: "added" });
    expect(toggleInList([A, B], A, 3)).toEqual({ list: [B], result: "removed" });
  });

  it("refuses to go past the maximum but still allows removing", () => {
    expect(toggleInList([A, B], C, 2)).toEqual({ list: [A, B], result: "full" });
    expect(toggleInList([A, B], B, 2)).toEqual({ list: [A], result: "removed" });
  });

  it("never mutates its input", () => {
    const list = [A];
    toggleInList(list, B, 3);
    expect(list).toEqual([A]);
  });
});

describe("parseIdList", () => {
  it("keeps valid unique uuids in order and lowercases them", () => {
    expect(parseIdList(`${A},${B.toUpperCase()},${A}`, 4)).toEqual([A, B]);
  });

  it("accepts arrays and comma lists, drops junk, and caps the length", () => {
    expect(parseIdList([A, "nope", `${B},${C}`], 4)).toEqual([A, B, C]);
    expect(parseIdList(`${A},${B},${C},${D},${E}`, MAX_COMPARE)).toEqual([A, B, C, D]);
    expect(parseIdList("1; drop table", 4)).toEqual([]);
    expect(parseIdList(undefined, 4)).toEqual([]);
    expect(parseIdList(42, 4)).toEqual([]);
  });
});

describe("sanitizeSaved", () => {
  it("turns damaged storage into empty lists", () => {
    for (const bad of [null, undefined, "x", 5, [], { favorites: "no" }]) {
      expect(sanitizeSaved(bad)).toEqual({ favorites: [], compare: [], recent: [] });
    }
  });

  it("keeps good data and enforces the compare maximum", () => {
    expect(sanitizeSaved({ favorites: [A, B, "junk"], compare: [A, B, C, D, E] })).toEqual({
      favorites: [A, B],
      compare: [A, B, C, D],
      recent: [],
    });
  });
});

describe("pruneIds and compareHref", () => {
  it("drops ids the server no longer returns", () => {
    expect(pruneIds([A, B, C], new Set([A, C]))).toEqual([A, C]);
  });

  it("builds the comparison link", () => {
    expect(compareHref([A, B])).toBe(`/compare?ids=${A},${B}`);
    expect(compareHref([])).toBe("/compare");
  });
});

describe("pushRecent", () => {
  it("puts the newest first and moves a repeat visit to the front", () => {
    expect(pushRecent([], A, 3)).toEqual([A]);
    expect(pushRecent([A, B], C, 3)).toEqual([C, A, B]);
    expect(pushRecent([A, B, C], B, 3)).toEqual([B, A, C]);
  });

  it("keeps at most the maximum, dropping the oldest", () => {
    expect(pushRecent([A, B, C], D, 3)).toEqual([D, A, B]);
  });

  it("never mutates its input", () => {
    const list = [A, B];
    pushRecent(list, C, 3);
    expect(list).toEqual([A, B]);
  });
});
