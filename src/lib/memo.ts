/**
 * A small in-memory cache for public, read-only data (the same for every
 * visitor). It lives in the memory of the running server or Worker isolate, so
 * it needs no extra infrastructure, and it works as stale-while-revalidate:
 *
 *  - fresh entries are returned immediately;
 *  - an entry past its time-to-live is still returned immediately while one
 *    background refresh runs, so visitors almost never wait for the database;
 *  - an entry older than MAX_STALE_FACTOR x ttl is not served: the caller waits.
 *
 * Never cache anything that depends on who is asking (admin data, cookies).
 */

const MAX_STALE_FACTOR = 10;
const REFRESH_TIMEOUT_MS = 30_000;
const MAX_ENTRIES = 500;

type Entry = {
  value?: unknown;
  settled: boolean;
  fetchedAt: number;
  promise?: Promise<unknown>;
  refreshStartedAt?: number;
};

const entries = new Map<string, Entry>();

/** Seconds of freshness. 0 turns the cache off (development, end-to-end tests). */
export function cacheSeconds(): number {
  const raw = process.env.STOREFRONT_CACHE_SECONDS;
  if (raw !== undefined && raw !== "") {
    const seconds = Number(raw);
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;
  }
  return process.env.NODE_ENV === "production" ? 30 : 0;
}

/** Lets a background refresh finish after the response has been sent (Cloudflare Workers). */
function keepAlive(promise: Promise<unknown>) {
  const context = (globalThis as Record<symbol, { ctx?: { waitUntil?: (p: Promise<unknown>) => void } } | undefined>)[
    Symbol.for("__cloudflare-context__")
  ];
  context?.ctx?.waitUntil?.(promise);
}

function remember(key: string, value: unknown) {
  entries.delete(key); // re-insert so the oldest entry is always first
  entries.set(key, { value, settled: true, fetchedAt: Date.now() });
  while (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value;
    if (oldest === undefined) break;
    entries.delete(oldest);
  }
}

/**
 * Wraps `load` so equal arguments share one cached result. `scale` multiplies
 * the global freshness (for data that changes less often than the catalogue).
 */
export function memoizeAsync<Args extends unknown[], T>(
  name: string,
  load: (...args: Args) => Promise<T>,
  { scale = 1 }: { scale?: number } = {},
): (...args: Args) => Promise<T> {
  return async (...args: Args): Promise<T> => {
    const ttlMs = cacheSeconds() * scale * 1000;
    if (ttlMs <= 0) return load(...args);

    const key = `${name}:${JSON.stringify(args)}`;
    const entry = entries.get(key);
    const now = Date.now();

    if (entry?.settled) {
      const age = now - entry.fetchedAt;
      if (age < ttlMs) return entry.value as T;

      if (age < ttlMs * MAX_STALE_FACTOR) {
        const refreshing =
          entry.refreshStartedAt !== undefined && now - entry.refreshStartedAt < REFRESH_TIMEOUT_MS;
        if (!refreshing) {
          entry.refreshStartedAt = now;
          const refresh = load(...args).then(
            (value) => remember(key, value),
            () => {
              entry.refreshStartedAt = undefined; // keep serving the old value, try again later
            },
          );
          keepAlive(refresh);
        }
        return entry.value as T;
      }
    }

    if (entry && !entry.settled && entry.promise) return entry.promise as Promise<T>;

    const promise = load(...args);
    const pending: Entry = { settled: false, fetchedAt: now, promise };
    entries.set(key, pending);
    promise.then(
      (value) => remember(key, value),
      () => {
        if (entries.get(key) === pending) entries.delete(key);
      },
    );
    return promise;
  };
}

/** Empties the cache (used by tests). */
export function clearMemo() {
  entries.clear();
}
