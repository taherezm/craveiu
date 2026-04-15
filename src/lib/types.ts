// ---------------------------------------------------------------------------
// CraveIU -- Shared TypeScript types
// ---------------------------------------------------------------------------

/** Unique identifier (UUID v4 from Postgres / Supabase). */
export type ID = string;

// ---- Enums ----------------------------------------------------------------

export const MealPeriod = {
  BREAKFAST: "breakfast",
  LUNCH: "lunch",
  DINNER: "dinner",
  LATE_NIGHT: "latenight",
} as const;

export type MealPeriod = (typeof MealPeriod)[keyof typeof MealPeriod];

export const PreferenceWeight = {
  MUST_HAVE: "must_have",
  NICE_TO_HAVE: "nice_to_have",
  AVOID: "avoid",
} as const;

export type PreferenceWeight =
  (typeof PreferenceWeight)[keyof typeof PreferenceWeight];

export const IngestionStatus = {
  SUCCESS: "success",
  PARTIAL: "partial",
  FAILED: "failed",
} as const;

export type IngestionStatus =
  (typeof IngestionStatus)[keyof typeof IngestionStatus];

export const FoodCategory = {
  COMFORT: "comfort",
  PROTEIN: "protein",
  BREAKFAST: "breakfast",
  SIDES: "sides",
  DESSERT: "dessert",
  HEALTHY: "healthy",
  INTERNATIONAL: "international",
} as const;

export type FoodCategory =
  (typeof FoodCategory)[keyof typeof FoodCategory];

// ---- Core domain models ---------------------------------------------------

export interface DiningHall {
  id: ID;
  name: string;
  slug: string;
  location: string;
  description: string;
  imageUrl: string | null;
  hours: Record<MealPeriod, { open: string; close: string }> | null;
}

export interface MenuSnapshot {
  id: ID;
  hallId: ID;
  date: string; // ISO date (YYYY-MM-DD)
  mealPeriod: MealPeriod;
  fetchedAt: string; // ISO datetime
  rawPayload: unknown;
  sourceHash: string;
}

export interface MenuItem {
  id: ID;
  snapshotId: ID;
  stationName: string;
  itemName: string;
  normalizedName: string;
  category: FoodCategory | null;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  calories: number | null;
  protein: number | null;
  allergens: string[];
}

export interface NormalizedFood {
  canonicalName: string;
  category: FoodCategory;
  keywords: string[];
  synonyms: string[];
}

// ---- User-facing models ---------------------------------------------------

export interface UserPreference {
  userId: ID;
  foodName: string;
  weight: PreferenceWeight;
  category: FoodCategory | null;
}

export interface UserAlert {
  userId: ID;
  foodName: string;
  hallId: ID | null;
  active: boolean;
}

// ---- Ranking & scoring ----------------------------------------------------

export interface MatchedItem {
  itemName: string;
  stationName: string;
  reason: string; // e.g. "matches preference: burger (must_have)"
}

export interface HallRanking {
  hallId: ID;
  hallName: string;
  score: number; // 0-100
  confidence: number; // 0-1, based on data freshness
  matchedItems: MatchedItem[];
  mealPeriod: MealPeriod;
  explanation: string;
}

export interface ScoringWeights {
  mustHaveMultiplier: number;
  niceToHaveMultiplier: number;
  avoidPenalty: number;
  freshnessDecay: number; // per-hour penalty
  varietyBonus: number;
}

// ---- Ingestion ------------------------------------------------------------

export interface IngestionLog {
  id: ID;
  hallId: ID;
  date: string;
  status: IngestionStatus;
  itemCount: number;
  errorMessage: string | null;
  createdAt: string;
}

// ---- UI helpers -----------------------------------------------------------

export interface QuickFilter {
  label: string;
  icon: string; // lucide icon name
  normalizedNames: string[];
}

export interface MealPeriodInfo {
  key: MealPeriod;
  label: string;
  startHour: number;
  endHour: number;
}
