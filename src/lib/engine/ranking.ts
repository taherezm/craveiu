/**
 * Hall Ranking Engine for CraveIU
 *
 * Scores each dining hall based on how well its current menu matches the
 * user's food preferences, then returns the halls sorted best-to-worst
 * with a plain-English explanation for each.
 */

import { normalizeItem, findCanonicalFood, FOOD_CATEGORIES } from "./normalization";
import type { NormalizedItem } from "./normalization";
import {
  DEFAULT_WEIGHTS,
  type ScoringWeights,
  type ScoreResult,
  type MatchedItem,
  type AvoidedItem,
  type UserPreference,
  type MenuItem,
} from "./scoring";

// ---------------------------------------------------------------------------
// Public input type for the ranking function
// ---------------------------------------------------------------------------

export interface RankHallsParams {
  /** Map of hallId -> hall info & menu items. */
  menusByHall: Map<string, { hallName: string; items: MenuItem[] }>;
  /** The user's food preferences (what they want, what they want to avoid). */
  userPreferences: UserPreference[];
  /** The current meal period, e.g. "breakfast", "lunch", "dinner". */
  currentMealPeriod: string;
  /** Optional custom scoring weights; falls back to DEFAULT_WEIGHTS. */
  weights?: Partial<ScoringWeights>;
}

export type HallRanking = ScoreResult;

// ---------------------------------------------------------------------------
// Main ranking function
// ---------------------------------------------------------------------------

/**
 * Rank all halls based on user preferences and the current menu.
 *
 * Scoring rules:
 *   - +must_have   for each must-have match
 *   - +nice_to_have for each nice-to-have match
 *   - +avoid       (negative) for each avoided item found
 *   - +multiple_match_bonus if 3+ positive matches in one hall
 *   - +available_now_bonus  per matched item if available in current meal period
 *   - +cluster_bonus        if hall has 2+ matches from the same food category
 *   - +protein_bonus        per matched protein-category item
 *
 * Results are sorted by totalScore descending.
 */
export function rankHalls(params: RankHallsParams): HallRanking[] {
  const {
    menusByHall,
    userPreferences,
    currentMealPeriod,
    weights: weightOverrides,
  } = params;

  const w: ScoringWeights = { ...DEFAULT_WEIGHTS, ...weightOverrides };
  const mealPeriod = currentMealPeriod.toLowerCase();

  // Pre-resolve each user preference to its canonical food.
  const resolvedPrefs = userPreferences.map((pref) => ({
    ...pref,
    canonical: findCanonicalFood(pref.foodName),
  }));

  const results: HallRanking[] = [];

  for (const [hallId, hall] of menusByHall.entries()) {
    const { hallName, items } = hall;

    // Normalize every menu item once.
    const normalizedMenu: { raw: MenuItem; norm: NormalizedItem }[] = items.map(
      (item) => ({ raw: item, norm: normalizeItem(item.name) }),
    );

    const matchedItems: MatchedItem[] = [];
    const avoidedItems: AvoidedItem[] = [];
    let score = 0;

    // Track which categories have matches (for cluster bonus).
    const matchedCategories = new Map<string, number>();

    for (const pref of resolvedPrefs) {
      if (!pref.canonical) continue; // unresolvable preference, skip

      for (const entry of normalizedMenu) {
        if (entry.norm.canonicalFood !== pref.canonical) continue;

        if (pref.weight === "avoid") {
          const penalty = w.avoid;
          avoidedItems.push({ name: entry.raw.name, points: penalty });
          score += penalty;
          // Only penalise once per avoided canonical food per hall.
          break;
        }

        // Positive match.
        const basePoints =
          pref.weight === "must_have" ? w.must_have : w.nice_to_have;
        let itemPoints = basePoints;

        // Available now bonus.
        const itemPeriod = (entry.raw.mealPeriod ?? "").toLowerCase();
        if (itemPeriod === mealPeriod || itemPeriod === "" || itemPeriod === "all") {
          itemPoints += w.available_now_bonus;
        }

        // Protein bonus.
        const category = FOOD_CATEGORIES[pref.canonical];
        if (category === "protein") {
          itemPoints += w.protein_bonus;
        }

        // Track category for cluster bonus.
        if (category) {
          matchedCategories.set(
            category,
            (matchedCategories.get(category) ?? 0) + 1,
          );
        }

        matchedItems.push({
          name: entry.raw.name,
          normalizedName: entry.norm.normalizedName,
          weight: pref.weight,
          points: itemPoints,
        });
        score += itemPoints;

        // Only count one menu match per preference per hall (avoid double-counting
        // when a hall lists the same food under two station names).
        break;
      }
    }

    // Multiple match bonus (3+ positive matches).
    if (matchedItems.length >= 3) {
      score += w.multiple_match_bonus;
    }

    // Cluster bonus: if any single category has 2+ matches.
    for (const count of matchedCategories.values()) {
      if (count >= 2) {
        score += w.cluster_bonus;
        break; // only apply once
      }
    }

    // Confidence: ratio of matchable preferences that were actually matched.
    const positivePrefs = resolvedPrefs.filter(
      (p) => p.weight !== "avoid" && p.canonical !== null,
    );
    const confidence =
      positivePrefs.length > 0
        ? Math.round((matchedItems.length / positivePrefs.length) * 100) / 100
        : 0;

    results.push({
      hallId,
      hallName,
      totalScore: score,
      confidence: Math.min(confidence, 1),
      matchedItems,
      avoidedItems,
      explanation: generateExplanation(hallName, matchedItems, avoidedItems, mealPeriod),
      mealPeriod,
    });
  }

  // Sort by score descending, then by confidence descending as tiebreaker.
  results.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return b.confidence - a.confidence;
  });

  return results;
}

// ---------------------------------------------------------------------------
// Explanation generator
// ---------------------------------------------------------------------------

/**
 * Builds a human-readable sentence explaining why a hall was ranked the way
 * it was.
 *
 * Examples:
 *  - "McNutt is your best option right now because it has chicken tenders,
 *     fries, and cookies at lunch, matching 3 of your preferred foods."
 *  - "Wright has no matches for your preferences at dinner."
 */
export function generateExplanation(
  hallName: string,
  matchedItems: MatchedItem[],
  avoidedItems: AvoidedItem[],
  mealPeriod: string,
): string {
  const period = mealPeriod || "this meal";

  if (matchedItems.length === 0 && avoidedItems.length === 0) {
    return `${hallName} has no matches for your preferences at ${period}.`;
  }

  const parts: string[] = [];

  if (matchedItems.length > 0) {
    const foodNames = matchedItems.map((m) => m.normalizedName);
    const listStr = formatList(foodNames);
    const plural = matchedItems.length === 1 ? "food" : "foods";
    parts.push(
      `${hallName} has ${listStr} at ${period}, matching ${matchedItems.length} of your preferred ${plural}`,
    );
  }

  if (avoidedItems.length > 0) {
    const avoidNames = avoidedItems.map((a) => a.name);
    const listStr = formatList(avoidNames);
    parts.push(
      `but watch out\u2014it also has ${listStr}, which you wanted to avoid`,
    );
  }

  return parts.join(", ") + ".";
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Format a list of strings with Oxford comma.
 *  ["a"]           -> "a"
 *  ["a", "b"]      -> "a and b"
 *  ["a", "b", "c"] -> "a, b, and c"
 */
function formatList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
