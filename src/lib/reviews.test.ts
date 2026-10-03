import { describe, expect, it } from "vitest";
import { checkReview, distribution, MAX_COMMENT, summarize } from "./reviews";

describe("checkReview", () => {
  it("accepts a rating alone, or with a name and comment, and tidies the text", () => {
    expect(checkReview({ rating: 5 })).toEqual({ ok: true, review: { rating: 5, name: null, comment: null } });
    expect(checkReview({ rating: 4, name: "  Sara   K. ", comment: "  Great\n\n\n\nvalue   for money " })).toEqual({
      ok: true,
      review: { rating: 4, name: "Sara K.", comment: "Great\n\nvalue for money" },
    });
    expect(checkReview({ rating: 3, comment: "منتج ممتاز وسعره مناسب" })).toMatchObject({ ok: true });
  });

  it("refuses ratings that are not a whole number from 1 to 5", () => {
    for (const rating of [0, 6, 2.5, -1, "5", null, undefined, Number.NaN]) {
      expect(checkReview({ rating }), String(rating)).toEqual({ ok: false, problem: "rating" });
    }
  });

  it("refuses text that is too long", () => {
    expect(checkReview({ rating: 5, name: "x".repeat(61) })).toEqual({ ok: false, problem: "name_too_long" });
    expect(checkReview({ rating: 5, comment: "x".repeat(MAX_COMMENT + 1) })).toEqual({ ok: false, problem: "comment_too_long" });
    expect(checkReview({ rating: 5, comment: "x".repeat(MAX_COMMENT) })).toMatchObject({ ok: true });
  });

  it("refuses links, the usual sign of spam", () => {
    for (const comment of ["see https://spam.example now", "visit www.spam.example", "buy at cheap-pills.com today", "http://x"]) {
      expect(checkReview({ rating: 5, comment }), comment).toEqual({ ok: false, problem: "has_link" });
    }
    expect(checkReview({ rating: 5, name: "spam.com" })).toEqual({ ok: false, problem: "has_link" });
  });

  it("does not mistake ordinary writing for a link", () => {
    expect(checkReview({ rating: 5, comment: "Works great. Battery lasts 2 days.Highly recommended" })).toMatchObject({ ok: true });
    expect(checkReview({ rating: 5, comment: "الشاحن ممتاز. يعمل بسرعة" })).toMatchObject({ ok: true });
  });
});

describe("summarize", () => {
  it("averages to one decimal and counts", () => {
    expect(summarize([5, 4, 4])).toEqual({ average: 4.3, count: 3 });
    expect(summarize([5])).toEqual({ average: 5, count: 1 });
    expect(summarize([1, 2])).toEqual({ average: 1.5, count: 2 });
  });

  it("has no average without ratings", () => {
    expect(summarize([])).toEqual({ average: null, count: 0 });
  });
});

describe("distribution", () => {
  it("counts each number of stars, from five down to one", () => {
    expect(distribution([5, 5, 3, 1])).toEqual([
      { stars: 5, count: 2 },
      { stars: 4, count: 0 },
      { stars: 3, count: 1 },
      { stars: 2, count: 0 },
      { stars: 1, count: 1 },
    ]);
  });
});
