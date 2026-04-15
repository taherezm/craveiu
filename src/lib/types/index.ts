/**
 * Core domain types for CraveIU.
 *
 * These types represent the canonical data model shared across ingestion,
 * normalization, storage, and presentation layers.
 */

// ---------------------------------------------------------------------------
// Dining halls
// ---------------------------------------------------------------------------

export interface DiningHall {
  id: string;
  name: string;
  slug: string;
  location?: { lat: number; lng: number };
  /** Human-readable description shown in the UI. */
  description?: string;
  /** Operating-hour windows keyed by meal period. */
  hours?: Record<MealPeriod, { open: string; close: string }>;
}

// ---------------------------------------------------------------------------
// Meal periods & food categories
// ---------------------------------------------------------------------------

export type MealPeriod = "breakfast" | "lunch" | "dinner";

export type FoodCategory =
  | "entree"
  | "side"
  | "breakfast"
  | "soup"
  | "salad"
  | "sandwich"
  | "pizza"
  | "pasta"
  | "grill"
  | "dessert"
  | "beverage"
  | "condiment"
  | "other";

// ---------------------------------------------------------------------------
// Menu items
// ---------------------------------------------------------------------------

export interface NutritionData {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sodium?: number;
}

export interface MenuItem {
  id: string;
  rawName: string;
  normalizedName: string;
  canonicalFood: string;
  category: FoodCategory;
  description?: string;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  allergens: string[];
  nutrition: NutritionData;
}

export interface Station {
  name: string;
  items: MenuItem[];
}

export interface MenuSnapshot {
  id: string;
  hallId: string;
  date: string; // ISO date YYYY-MM-DD
  mealPeriod: MealPeriod;
  stations: Station[];
  sourceHash: string;
  parseConfidence: number;
  ingestedAt: string; // ISO datetime
}

// ---------------------------------------------------------------------------
// User preferences
// ---------------------------------------------------------------------------

export interface UserPreferences {
  id: string;
  userId: string;
  dietaryFlags: {
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
  };
  allergens: string[];
  favoriteFoods: string[];
  dislikedFoods: string[];
  preferredHalls: string[];
  calorieTarget?: { min: number; max: number };
  proteinTarget?: { min: number; max: number };
}

// ---------------------------------------------------------------------------
// Ingestion types (shared between adapters and parser)
// ---------------------------------------------------------------------------

export interface ParsedMenuItem {
  rawName: string;
  normalizedName: string;
  canonicalFood: string;
  category: FoodCategory;
  confidence: number;
  nutritionData: NutritionData;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  allergens: string[];
  description?: string;
}

export interface ParsedStation {
  name: string;
  items: ParsedMenuItem[];
}

export interface ParsedMenu {
  hallId: string;
  date: string;
  mealPeriod: MealPeriod;
  stations: ParsedStation[];
  sourceHash: string;
  parseConfidence: number;
}

export interface IngestionResult {
  date: string;
  menusIngested: number;
  totalItems: number;
  averageConfidence: number;
  errors: IngestionError[];
  skippedDuplicates: number;
  durationMs: number;
}

export interface IngestionError {
  hallName: string;
  mealPeriod: string;
  message: string;
  timestamp: string;
}
