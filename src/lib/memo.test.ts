import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cacheSeconds, clearMemo, memoizeAsync } from "./memo";

describe("memoizeAsync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("STOREFRONT_CACHE_SECONDS", "30");
    clearMemo();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  const counter = () => {
    let calls = 0;
    const load = vi.fn(async (id: string) => `${id}#${++calls}`);
    return load;
  };

  it("loads once and serves repeats from memory while fresh", async () => {
    const load = counter();
    const get = memoizeAsync("a", load);
    expect(await get("x")).toBe("x#1");
    vi.advanceTimersByTime(29_000);
    expect(await get("x")).toBe("x#1");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("keeps separate entries for different arguments", async () => {
    const load = counter();
    const get = memoizeAsync("b", load);
    expect(await get("x")).toBe("x#1");
    expect(await get("y")).toBe("y#2");
    expect(await get("x")).toBe("x#1");
  });

  it("shares one load between simultaneous callers", async () => {
    let release!: (value: string) => void;
    const load = vi.fn(() => new Promise<string>((resolve) => (release = resolve)));
    const get = memoizeAsync("c", load);
    const first = get();
    const second = get();
    release("done");
    expect(await Promise.all([first, second])).toEqual(["done", "done"]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("serves the stale value at once after the ttl and refreshes in the background", async () => {
    const load = counter();
    const get = memoizeAsync("d", load);
    expect(await get("x")).toBe("x#1");

    vi.advanceTimersByTime(31_000);
    expect(await get("x")).toBe("x#1"); // stale, returned without waiting
    expect(load).toHaveBeenCalledTimes(2); // refresh started
    await vi.advanceTimersByTimeAsync(0);
    expect(await get("x")).toBe("x#2"); // the refreshed value
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("starts only one refresh for many stale requests", async () => {
    const load = counter();
    const get = memoizeAsync("e", load);
    await get("x");
    vi.advanceTimersByTime(31_000);
    await Promise.all([get("x"), get("x"), get("x")]);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("makes the caller wait once an entry is far too old", async () => {
    const load = counter();
    const get = memoizeAsync("f", load);
    await get("x");
    vi.advanceTimersByTime(30_000 * 10 + 1000);
    expect(await get("x")).toBe("x#2");
  });

  it("keeps serving the old value when a refresh fails", async () => {
    let fail = false;
    const load = vi.fn(async () => {
      if (fail) throw new Error("db down");
      return "ok";
    });
    const get = memoizeAsync("g", load);
    await get();
    fail = true;
    vi.advanceTimersByTime(31_000);
    expect(await get()).toBe("ok");
    await vi.advanceTimersByTimeAsync(0);
    expect(await get()).toBe("ok");
  });

  it("does not cache a failed first load", async () => {
    let calls = 0;
    const load = vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new Error("boom");
      return "fine";
    });
    const get = memoizeAsync("h", load);
    await expect(get()).rejects.toThrow("boom");
    expect(await get()).toBe("fine");
  });

  it("is a pass-through when the cache is switched off", async () => {
    vi.stubEnv("STOREFRONT_CACHE_SECONDS", "0");
    const load = counter();
    const get = memoizeAsync("i", load);
    expect(await get("x")).toBe("x#1");
    expect(await get("x")).toBe("x#2");
  });

  it("applies a scale to the freshness of slower-changing data", async () => {
    const load = counter();
    const get = memoizeAsync("j", load, { scale: 4 }); // 120 s
    await get("x");
    vi.advanceTimersByTime(100_000);
    expect(await get("x")).toBe("x#1");
    expect(load).toHaveBeenCalledTimes(1);
  });
});

describe("cacheSeconds", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the configured value", () => {
    vi.stubEnv("STOREFRONT_CACHE_SECONDS", "45");
    expect(cacheSeconds()).toBe(45);
  });

  it("is off in development and 30 seconds in production by default", () => {
    vi.stubEnv("STOREFRONT_CACHE_SECONDS", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(cacheSeconds()).toBe(0);
    vi.stubEnv("NODE_ENV", "production");
    expect(cacheSeconds()).toBe(30);
  });

  it("ignores nonsense and negative values", () => {
    vi.stubEnv("STOREFRONT_CACHE_SECONDS", "abc");
    expect(cacheSeconds()).toBe(0);
    vi.stubEnv("STOREFRONT_CACHE_SECONDS", "-5");
    expect(cacheSeconds()).toBe(0);
  });
});
