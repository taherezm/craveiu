/**
 * Scoring Constants and Types for CraveIU
 *
 * Defines the weight system and result shapes used by the ranking engine.
 */

// ---------------------------------------------------------------------------
// Weight configuration
// ---------------------------------------------------------------------------

export interface ScoringWeights {
  /** Points awarded when a must-have item is found on the menu. */
  must_have: number;
  /** Points awarded when a nice-to-have item is found. */
  nice_to_have: number;
  /** Points deducted when an avoided item is found. */
  avoid: number;
  /** Bonus when 3 or more preferred items match in a single hall. */
  multiple_match_bonus: number;
  /** Bonus when the item is available during the current meal period. */
  available_now_bonus: number;
  /** Bonus when matched items share the same food category. */
  cluster_bonus: number;
  /** Bonus applied to protein-category matches. */
  protein_bonus: number;
}

export const DEFAULT_WEIGHTS: Readonly<ScoringWeights> = {
  must_have: 10,
  nice_to_have: 5,
  avoid: -8,
  multiple_match_bonus: 3,
  available_now_bonus: 2,
  cluster_bonus: 2,
  protein_bonus: 3,
} as const;

// ---------------------------------------------------------------------------
// Preference weight enum (used by callers to tag each preference)
// ---------------------------------------------------------------------------

export type PreferenceWeight = "must_have" | "nice_to_have" | "avoid";

// ---------------------------------------------------------------------------
// Score result types
// ---------------------------------------------------------------------------

export interface MatchedItem {
  /** Raw menu item name as it appears in the dining hall. */
  name: string;
  /** Normalized / canonical name after running through the normalization engine. */
  normalizedName: string;
  /** Which preference weight category this matched ("must_have" | "nice_to_have"). */
  weight: PreferenceWeight;
  /** Points contributed by this match (before bonuses). */
  points: number;
}

export interface AvoidedItem {
  /** Raw menu item name that triggered the avoid penalty. */
  name: string;
  /** Points deducted (negative number). */
  points: number;
}

export interface ScoreResult {
  /** Unique identifier of the dining hall. */
  hallId: string;
  /** Human-readable hall name (e.g. "McNutt"). */
  hallName: string;
  /** Final computed score for this hall. */
  totalScore: number;
  /** Confidence that the score is meaningful (0-1). */
  confidence: number;
  /** Items the user wanted that were found in this hall. */
  matchedItems: MatchedItem[];
  /** Items the user wanted to avoid that were found in this hall. */
  avoidedItems: AvoidedItem[];
  /** Plain-English explanation of the ranking. */
  explanation: string;
  /** The meal period used for scoring (e.g. "lunch"). */
  mealPeriod: string;
}

// ---------------------------------------------------------------------------
// User preference input type (convenience re-export for callers)
// ---------------------------------------------------------------------------

export interface UserPreference {
  /** Free-text food name the user typed. */
  foodName: string;
  /** How important this food is to the user. */
  weight: PreferenceWeight;
}

// ---------------------------------------------------------------------------
// Menu item type expected by the ranking engine
// ---------------------------------------------------------------------------

export interface MenuItem {
  /** Raw name of the menu item from the dining hall feed. */
  name: string;
  /** Which meal period this item is served during. */
  mealPeriod?: string;
  /** Optional station or section within the hall (e.g. "Grill", "Salad Bar"). */
  station?: string;
}

// ---------------------------------------------------------------------------
// Hall ranking input type
// ---------------------------------------------------------------------------

export interface HallMenu {
  hallId: string;
  hallName: string;
  items: MenuItem[];
}
