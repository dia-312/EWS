/** True when `next` holds exactly the ids of `current`, each once, in any order. */
export function isPermutation(next: readonly string[], current: readonly string[]): boolean {
  if (next.length !== current.length) return false;
  if (new Set(next).size !== next.length) return false;
  const known = new Set(current);
  return next.every((id) => known.has(id));
}

/** The order to show: the visitor's drag result while it still matches the saved list, otherwise the saved list. */
export function effectiveOrder(
  saved: readonly string[],
  dragged: { base: string; order: string[] } | null,
): string[] {
  const key = saved.join(",");
  return dragged && dragged.base === key && isPermutation(dragged.order, saved) ? dragged.order : [...saved];
}

/** Moves the item at `from` to position `to` and returns the new order. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const result = [...items];
  if (from < 0 || from >= result.length || to < 0 || to >= result.length || from === to) return result;
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved);
  return result;
}
