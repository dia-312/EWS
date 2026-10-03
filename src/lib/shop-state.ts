/**
 * Pure rules behind the visitor's favourites and comparison list. They live in
 * the browser (no accounts), so they are written as plain functions that are
 * easy to test; the Zustand store in shop-store.ts only wires them to storage.
 */

/** Most products that can be compared side by side. */
export const MAX_COMPARE = 4;
/** Safety limit so the saved list can never grow without bound. */
export const MAX_FAVORITES = 200;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ToggleResult = "added" | "removed" | "full";

/** Adds the id if it is missing, removes it if present, and refuses past `max`. */
export function toggleInList(
  list: readonly string[],
  id: string,
  max: number,
): { list: string[]; result: ToggleResult } {
  if (list.includes(id)) {
    return { list: list.filter((item) => item !== id), result: "removed" };
  }
  if (list.length >= max) return { list: [...list], result: "full" };
  return { list: [...list, id], result: "added" };
}

/**
 * Reads a list of product ids from a URL or from storage: valid uuids only, no
 * duplicates, original order, at most `max`. Anything else is dropped.
 */
export function parseIdList(value: unknown, max: number): string[] {
  const parts = Array.isArray(value)
    ? value.flatMap((item) => String(item).split(","))
    : typeof value === "string"
      ? value.split(",")
      : [];

  const seen = new Set<string>();
  for (const part of parts) {
    const id = part.trim().toLowerCase();
    if (UUID.test(id)) seen.add(id);
    if (seen.size >= max) break;
  }
  return [...seen];
}

/** What the browser keeps; unknown or damaged data becomes an empty list. */
export function sanitizeSaved(raw: unknown): { favorites: string[]; compare: string[] } {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    favorites: parseIdList(data.favorites, MAX_FAVORITES),
    compare: parseIdList(data.compare, MAX_COMPARE),
  };
}

/** Drops ids the server no longer knows (deleted or hidden products). */
export function pruneIds(saved: readonly string[], known: ReadonlySet<string>): string[] {
  return saved.filter((id) => known.has(id));
}

export function compareHref(ids: readonly string[]): string {
  return ids.length > 0 ? `/compare?ids=${ids.join(",")}` : "/compare";
}
