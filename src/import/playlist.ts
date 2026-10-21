import type { Transition } from "../graph/types";

export type IdFactory = () => string;

let counter = 0;
const defaultId: IdFactory = () => `t_${Date.now().toString(36)}_${(counter++).toString(36)}`;

/**
 * Turn an ordered set (song ids as played) into transitions: each back-to-back pair
 * becomes one edge. Repeats of the same song back to back are skipped, and pairs that
 * already exist in `existing` (or earlier in this set) are not duplicated.
 */
export function transitionsFromSet(
  orderedSongIds: readonly string[],
  existing: readonly Transition[] = [],
  makeId: IdFactory = defaultId,
): Transition[] {
  const seen = new Set(existing.map((t) => `${t.from}\u0000${t.to}`));
  const created: Transition[] = [];
  for (let i = 0; i < orderedSongIds.length - 1; i++) {
    const from = orderedSongIds[i]!;
    const to = orderedSongIds[i + 1]!;
    const key = `${from}\u0000${to}`;
    if (from === to || seen.has(key)) continue;
    seen.add(key);
    created.push({ id: makeId(), from, to, cueSec: null });
  }
  return created;
}
