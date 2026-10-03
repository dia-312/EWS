import { describe, expect, it } from "vitest";
import { effectiveOrder, isPermutation, moveItem } from "./reorder";

describe("isPermutation", () => {
  it("accepts the same ids in any order", () => {
    expect(isPermutation(["b", "a", "c"], ["a", "b", "c"])).toBe(true);
    expect(isPermutation([], [])).toBe(true);
  });

  it("rejects missing, extra, repeated or unknown ids", () => {
    expect(isPermutation(["a", "b"], ["a", "b", "c"])).toBe(false);
    expect(isPermutation(["a", "b", "c", "d"], ["a", "b", "c"])).toBe(false);
    expect(isPermutation(["a", "a", "b"], ["a", "b", "c"])).toBe(false);
    expect(isPermutation(["a", "b", "x"], ["a", "b", "c"])).toBe(false);
  });
});

describe("moveItem", () => {
  it("moves an item to a new position", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("leaves the list alone for impossible moves, and never changes the input", () => {
    const input = ["a", "b", "c"];
    expect(moveItem(input, 1, 1)).toEqual(input);
    expect(moveItem(input, -1, 1)).toEqual(input);
    expect(moveItem(input, 0, 9)).toEqual(input);
    expect(input).toEqual(["a", "b", "c"]);
  });
});

describe("effectiveOrder", () => {
  const saved = ["a", "b", "c"];

  it("shows the saved order when nothing was dragged", () => {
    expect(effectiveOrder(saved, null)).toEqual(saved);
  });

  it("shows the dragged order while it was made from the current saved list", () => {
    expect(effectiveOrder(saved, { base: "a,b,c", order: ["c", "a", "b"] })).toEqual(["c", "a", "b"]);
  });

  it("goes back to the saved order once the saved list changed (another move, an added item)", () => {
    expect(effectiveOrder(["b", "a", "c"], { base: "a,b,c", order: ["c", "a", "b"] })).toEqual(["b", "a", "c"]);
    expect(effectiveOrder(["a", "b", "c", "d"], { base: "a,b,c", order: ["c", "a", "b"] })).toEqual(["a", "b", "c", "d"]);
  });
});
