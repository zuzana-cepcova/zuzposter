/**
 * Fair random pick: prefers players who held a role least often, avoids
 * immediate repeats when possible, and breaks ties randomly. Never fails
 * when there is at least one candidate.
 */
export function fairPick<T extends string>(
  candidates: T[],
  history: (T | null | undefined)[], // oldest → newest holders of this role
  rand: () => number = Math.random,
): T | null {
  if (candidates.length === 0) return null;
  const last = history.length ? history[history.length - 1] : null;
  let pool = candidates.length > 1 && last ? candidates.filter((c) => c !== last) : candidates;
  if (pool.length === 0) pool = candidates;
  const counts = new Map<T, number>();
  for (const h of history) if (h) counts.set(h, (counts.get(h) ?? 0) + 1);
  const min = Math.min(...pool.map((c) => counts.get(c) ?? 0));
  const best = pool.filter((c) => (counts.get(c) ?? 0) === min);
  return best[Math.floor(rand() * best.length)] ?? best[0];
}
