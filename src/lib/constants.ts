// ---------------------------------------------------------------------------
// CraveIU -- Application constants
// ---------------------------------------------------------------------------

import type {
  DiningHall,
  FoodCategory,
  MealPeriodInfo,
  QuickFilter,
  ScoringWeights,
} from "./types";

// ---- Dining halls ---------------------------------------------------------

/**
 * All five IU Bloomington residential dining locations.
 * `id` is intentionally a stable slug-like string so it can serve as a
 * client-side key before the DB row exists.
 */
export const DINING_HALLS: Omit<DiningHall, "id">[] = [
  {
    name: "Collins Eatery",
    slug: "collins",
    location: "Collins Living-Learning Center, East side of campus",
    description:
      "Cozy eatery inside Collins LLC, known for rotating comfort-food specials.",
    imageUrl: null,
    hours: null,
  },
  {
    name: "Forest Dining Hall",
    slug: "forest",
    location: "Forest Quad, Central campus",
    description:
      "Classic all-you-care-to-eat dining hall with wide variety and late-night hours.",
    imageUrl: null,
    hours: null,
  },
  {
    name: "Goodbody Hall Eatery",
    slug: "goodbody",
    location: "Goodbody Hall, Near the Old Crescent",
    description:
      "Smaller venue featuring fresh-made sandwiches, salads, and daily soups.",
    imageUrl: null,
    hours: null,
  },
  {
    name: "McNutt Dining Hall",
    slug: "mcnutt",
    location: "McNutt Quad, Northwest campus",
    description:
      "Popular dining hall with a strong breakfast menu and build-your-own stations.",
    imageUrl: null,
    hours: null,
  },
  {
    name: "Wright Dining Hall",
    slug: "wright",
    location: "Wright Quad, South-central campus",
    description:
      "Full-service dining hall offering international cuisine and a dessert bar.",
    imageUrl: null,
    hours: null,
  },
] as const;

// ---- Meal periods ---------------------------------------------------------

export const MEAL_PERIODS: MealPeriodInfo[] = [
  { key: "breakfast", label: "Breakfast", startHour: 7, endHour: 10 },
  { key: "lunch", label: "Lunch", startHour: 11, endHour: 14 },
  { key: "dinner", label: "Dinner", startHour: 17, endHour: 20 },
  { key: "latenight", label: "Late Night", startHour: 20, endHour: 23 },
] as const;

// ---- Quick filters --------------------------------------------------------

export const QUICK_FILTERS: QuickFilter[] = [
  {
    label: "Burgers",
    icon: "Beef",
    normalizedNames: [
      "burger",
      "cheeseburger",
      "hamburger",
      "veggie burger",
      "black bean burger",
    ],
  },
  {
    label: "Tenders",
    icon: "Drumstick",
    normalizedNames: [
      "chicken tenders",
      "chicken strips",
      "chicken fingers",
      "crispy tenders",
    ],
  },
  {
    label: "Wings",
    icon: "Flame",
    normalizedNames: [
      "chicken wings",
      "buffalo wings",
      "boneless wings",
      "wings",
    ],
  },
  {
    label: "Bacon",
    icon: "Bacon",
    normalizedNames: ["bacon", "turkey bacon", "bacon strips"],
  },
  {
    label: "Pizza",
    icon: "Pizza",
    normalizedNames: [
      "pizza",
      "cheese pizza",
      "pepperoni pizza",
      "margherita pizza",
    ],
  },
  {
    label: "Dessert",
    icon: "Cake",
    normalizedNames: [
      "cake",
      "cookie",
      "brownie",
      "ice cream",
      "pie",
      "pudding",
      "muffin",
    ],
  },
  {
    label: "High Protein",
    icon: "Dumbbell",
    normalizedNames: [
      "grilled chicken",
      "steak",
      "salmon",
      "turkey",
      "eggs",
      "tofu",
      "black beans",
    ],
  },
  {
    label: "Vegetarian",
    icon: "Leaf",
    normalizedNames: [
      "veggie burger",
      "tofu",
      "grilled vegetables",
      "falafel",
      "hummus",
      "black bean burger",
    ],
  },
  {
    label: "Spicy",
    icon: "Pepper",
    normalizedNames: [
      "buffalo wings",
      "spicy chicken",
      "jalapeno",
      "hot sauce",
      "sriracha",
      "cajun",
    ],
  },
  {
    label: "Breakfast",
    icon: "Egg",
    normalizedNames: [
      "pancakes",
      "waffles",
      "eggs",
      "omelette",
      "french toast",
      "bacon",
      "sausage",
      "hash browns",
    ],
  },
] as const;

// ---- Food categories ------------------------------------------------------

export const FOOD_CATEGORIES: { key: FoodCategory; label: string }[] = [
  { key: "comfort", label: "Comfort Food" },
  { key: "protein", label: "Protein" },
  { key: "breakfast", label: "Breakfast" },
  { key: "sides", label: "Sides" },
  { key: "dessert", label: "Dessert" },
  { key: "healthy", label: "Healthy" },
  { key: "international", label: "International" },
] as const;

// ---- Scoring defaults -----------------------------------------------------

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  mustHaveMultiplier: 10,
  niceToHaveMultiplier: 4,
  avoidPenalty: -8,
  freshnessDecay: 2, // points lost per hour since last fetch
  varietyBonus: 1.5, // bonus per additional matched item
} as const;

// ---- Misc -----------------------------------------------------------------

/** How often (in minutes) we consider menu data "stale". */
export const STALE_THRESHOLD_MINUTES = 120;

/** Maximum number of items a user can add to preferences. */
export const MAX_USER_PREFERENCES = 50;
