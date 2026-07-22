import { EXACT_MATCH_WINDOW_MINUTES, NEARBY_MATCH_WINDOW_HOURS } from "@/lib/constants";

export type TimedItem = { time: Date };

// Shared clustering/search logic: given a reference time and a list of
// same-location candidates, splits them into "exact" (within a tight window,
// e.g. arriving around the same half hour) and "nearby" (further out but
// still plausibly worth showing) — both sorted closest-first. Used by the
// arrivals board (grouping people arriving at similar times) and the home
// feed's date/time search (item 2: "sort by precise time, then show nearby
// once exact is exhausted") — one implementation, two call sites.
export function splitByProximity<T extends TimedItem>(
  candidates: T[],
  referenceTime: Date
) {
  const withDiff = candidates
    .map((item) => ({ item, diffMs: Math.abs(item.time.getTime() - referenceTime.getTime()) }))
    .sort((a, b) => a.diffMs - b.diffMs);

  const exactMs = EXACT_MATCH_WINDOW_MINUTES * 60 * 1000;
  const nearbyMs = NEARBY_MATCH_WINDOW_HOURS * 60 * 60 * 1000;

  const exact = withDiff.filter((w) => w.diffMs <= exactMs).map((w) => w.item);
  const nearby = withDiff.filter((w) => w.diffMs > exactMs && w.diffMs <= nearbyMs).map((w) => w.item);

  return { exact, nearby };
}
