/**
 * Food Normalization Engine for CraveIU
 *
 * Normalizes raw dining-hall menu item names into canonical food identifiers
 * so that user preferences can be matched against any hall's menu regardless
 * of how the item is worded on the serving line.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NormalizedItem {
  /** The original menu string, lowercased and trimmed. */
  normalizedName: string;
  /** The canonical food key (e.g. "burgers"), or null if no match. */
  canonicalFood: string | null;
  /** The food category (e.g. "comfort"), or null if no match. */
  category: string | null;
  /** Match confidence 0-1.  1 = exact keyword hit, lower = fuzzy. */
  confidence: number;
}

export type FoodCategory =
  | "comfort"
  | "protein"
  | "breakfast"
  | "sides"
  | "dessert"
  | "healthy"
  | "international";

// ---------------------------------------------------------------------------
// Synonym dictionary
// ---------------------------------------------------------------------------

/**
 * Maps each canonical food name to an array of keywords / synonyms.
 * Order does not matter; matching is case-insensitive substring-first.
 */
export const FOOD_SYNONYMS: Record<string, string[]> = {
  burgers: [
    "burger",
    "smashburger",
    "cheeseburger",
    "hamburger",
    "beef burger",
    "veggie burger",
    "black bean burger",
    "beyond burger",
    "patty melt",
    "impossible burger",
    "turkey burger",
    "slider",
    "double burger",
    "bacon cheeseburger",
    "mushroom burger",
  ],
  chicken_tenders: [
    "tenders",
    "chicken tender",
    "crispy tender",
    "chicken strip",
    "chicken finger",
    "buttermilk tender",
    "popcorn chicken",
    "chicken nugget",
    "tender basket",
    "hand-breaded tender",
    "fried chicken tender",
  ],
  wings: [
    "wing",
    "buffalo wing",
    "chicken wing",
    "boneless wing",
    "hot wing",
    "bbq wing",
    "wing bar",
    "garlic parmesan wing",
    "lemon pepper wing",
    "teriyaki wing",
    "wing night",
    "traditional wing",
  ],
  bacon: [
    "bacon",
    "applewood bacon",
    "smoked bacon",
    "turkey bacon",
    "bacon strip",
    "crispy bacon",
    "thick cut bacon",
    "maple bacon",
    "canadian bacon",
    "bacon bit",
  ],
  pizza: [
    "pizza",
    "cheese pizza",
    "pepperoni pizza",
    "flatbread",
    "personal pizza",
    "pizza slice",
    "margherita",
    "meat lovers pizza",
    "supreme pizza",
    "bbq chicken pizza",
    "hawaiian pizza",
    "stuffed crust",
    "deep dish",
    "thin crust pizza",
  ],
  fries: [
    "fries",
    "french fries",
    "curly fries",
    "seasoned fries",
    "waffle fries",
    "sweet potato fries",
    "tater tots",
    "steak fries",
    "cajun fries",
    "garlic fries",
    "loaded fries",
    "cheese fries",
    "crinkle cut fries",
    "shoestring fries",
  ],
  grilled_chicken: [
    "grilled chicken",
    "grilled chicken breast",
    "herb chicken",
    "lemon pepper chicken",
    "chicken breast",
    "roasted chicken",
    "baked chicken",
    "herb roasted chicken",
    "cajun chicken",
    "blackened chicken",
    "marinated chicken",
  ],
  pancakes: [
    "pancake",
    "buttermilk pancake",
    "blueberry pancake",
    "chocolate chip pancake",
    "hotcake",
    "flapjack",
    "silver dollar pancake",
    "banana pancake",
    "protein pancake",
    "pancake stack",
  ],
  waffles: [
    "waffle",
    "belgian waffle",
    "waffle bar",
    "blueberry waffle",
    "chocolate waffle",
    "waffle station",
    "mini waffle",
    "liege waffle",
  ],
  eggs: [
    "scrambled egg",
    "fried egg",
    "omelette",
    "omelet",
    "egg bar",
    "egg sandwich",
    "hard boiled egg",
    "eggs benedict",
    "poached egg",
    "egg white",
    "veggie omelet",
    "western omelet",
    "breakfast egg",
    "egg station",
    "over easy egg",
    "sunny side up",
  ],
  mozzarella_sticks: [
    "mozzarella stick",
    "mozz stick",
    "cheese stick",
    "fried mozzarella",
    "mozzarella finger",
    "breaded mozzarella",
  ],
  soft_serve: [
    "soft serve",
    "frozen yogurt",
    "ice cream machine",
    "swirl cone",
    "froyo",
    "soft serve station",
    "yogurt machine",
  ],
  ice_cream: [
    "ice cream",
    "sundae",
    "ice cream bar",
    "ice cream sandwich",
    "ice cream scoop",
    "gelato",
    "milkshake",
    "ice cream cone",
    "banana split",
    "ice cream float",
  ],
  cookies: [
    "cookie",
    "chocolate chip cookie",
    "sugar cookie",
    "snickerdoodle",
    "fresh baked cookie",
    "oatmeal raisin cookie",
    "peanut butter cookie",
    "double chocolate cookie",
    "white chocolate macadamia",
    "warm cookie",
  ],
  mac_and_cheese: [
    "mac and cheese",
    "macaroni and cheese",
    "baked mac",
    "mac & cheese",
    "mac n cheese",
    "white cheddar mac",
    "bacon mac and cheese",
    "three cheese mac",
    "jalape\u00f1o mac",
    "truffle mac",
  ],
  salad: [
    "salad",
    "garden salad",
    "caesar salad",
    "salad bar",
    "mixed greens",
    "chef salad",
    "greek salad",
    "cobb salad",
    "spinach salad",
    "side salad",
    "chopped salad",
    "house salad",
    "kale salad",
    "asian salad",
  ],
  soup: [
    "soup",
    "chicken noodle soup",
    "tomato soup",
    "broccoli cheddar",
    "chili",
    "soup bar",
    "clam chowder",
    "minestrone",
    "french onion soup",
    "soup station",
    "beef stew",
    "cream of mushroom",
    "lentil soup",
    "tortilla soup",
  ],
  tacos: [
    "taco",
    "beef taco",
    "chicken taco",
    "fish taco",
    "taco bar",
    "street taco",
    "taco salad",
    "soft taco",
    "hard shell taco",
    "carnitas taco",
    "al pastor",
    "taco station",
    "birria taco",
    "breakfast taco",
  ],
  pasta: [
    "pasta",
    "spaghetti",
    "penne",
    "fettuccine",
    "linguine",
    "alfredo",
    "marinara",
    "pasta bar",
    "rigatoni",
    "rotini",
    "tortellini",
    "ravioli",
    "carbonara",
    "bolognese",
    "baked ziti",
    "lasagna",
    "pasta station",
    "garlic butter pasta",
  ],
  rice: [
    "rice",
    "white rice",
    "fried rice",
    "brown rice",
    "rice bowl",
    "jasmine rice",
    "rice pilaf",
    "cilantro lime rice",
    "sticky rice",
    "basmati rice",
    "spanish rice",
    "yellow rice",
    "coconut rice",
  ],
  stir_fry: [
    "stir fry",
    "stirfry",
    "wok station",
    "teriyaki",
    "asian bowl",
    "lo mein",
    "noodle bowl",
    "kung pao",
    "general tso",
    "orange chicken",
    "mongolian beef",
    "sesame chicken",
    "fried noodle",
    "chow mein",
    "pad thai",
    "bibimbap",
    "poke bowl",
  ],
} as const;

// ---------------------------------------------------------------------------
// Category map
// ---------------------------------------------------------------------------

/**
 * Maps each canonical food to a high-level category.
 */
export const FOOD_CATEGORIES: Record<string, FoodCategory> = {
  burgers: "comfort",
  chicken_tenders: "comfort",
  wings: "comfort",
  bacon: "breakfast",
  pizza: "comfort",
  fries: "sides",
  grilled_chicken: "protein",
  pancakes: "breakfast",
  waffles: "breakfast",
  eggs: "breakfast",
  mozzarella_sticks: "sides",
  soft_serve: "dessert",
  ice_cream: "dessert",
  cookies: "dessert",
  mac_and_cheese: "comfort",
  salad: "healthy",
  soup: "healthy",
  tacos: "international",
  pasta: "international",
  rice: "international",
  stir_fry: "international",
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Normalize whitespace, lowercase, strip leading/trailing junk. */
function clean(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Simple character-level similarity score (0-1) loosely inspired by
 * Levenshtein distance but much cheaper to compute.  Returns 1 for an
 * exact match and decreases as strings diverge.
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  // Use the shorter string length to bound the matrix.
  const lenA = a.length;
  const lenB = b.length;

  // Build a simple Levenshtein distance matrix (two-row optimisation).
  let prev = new Array<number>(lenB + 1);
  let curr = new Array<number>(lenB + 1);

  for (let j = 0; j <= lenB; j++) prev[j] = j;

  for (let i = 1; i <= lenA; i++) {
    curr[0] = i;
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,     // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  const distance = prev[lenB];
  const maxLen = Math.max(lenA, lenB);
  return 1 - distance / maxLen;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Normalizes a single raw menu item name into a canonical food + category.
 *
 * Strategy:
 *  1. Exact substring match against every synonym  -> confidence 1.0
 *  2. Fuzzy similarity check (best match >= 0.65)  -> confidence = sim * 0.9
 *  3. No match                                      -> canonicalFood = null
 */
export function normalizeItem(rawName: string): NormalizedItem {
  const normalizedName = clean(rawName);

  // --- Pass 1: keyword / substring matching ---
  for (const [canonical, synonyms] of Object.entries(FOOD_SYNONYMS)) {
    for (const synonym of synonyms) {
      if (normalizedName.includes(synonym)) {
        return {
          normalizedName,
          canonicalFood: canonical,
          category: FOOD_CATEGORIES[canonical] ?? null,
          confidence: 1,
        };
      }
    }
  }

  // --- Pass 2: fuzzy matching ---
  let bestCanonical: string | null = null;
  let bestScore = 0;

  for (const [canonical, synonyms] of Object.entries(FOOD_SYNONYMS)) {
    for (const synonym of synonyms) {
      const sim = similarity(normalizedName, synonym);
      if (sim > bestScore) {
        bestScore = sim;
        bestCanonical = canonical;
      }
    }
  }

  const FUZZY_THRESHOLD = 0.65;
  if (bestCanonical && bestScore >= FUZZY_THRESHOLD) {
    return {
      normalizedName,
      canonicalFood: bestCanonical,
      category: FOOD_CATEGORIES[bestCanonical] ?? null,
      confidence: Math.round(bestScore * 0.9 * 100) / 100,
    };
  }

  return {
    normalizedName,
    canonicalFood: null,
    category: null,
    confidence: 0,
  };
}

/**
 * Normalizes an array of raw menu item names.
 */
export function normalizeItems(items: string[]): NormalizedItem[] {
  return items.map(normalizeItem);
}

/**
 * Given a user's free-text search query, find the best-matching canonical food.
 *
 * Returns the canonical key (e.g. "burgers") or null if nothing matches.
 */
export function findCanonicalFood(query: string): string | null {
  const cleaned = clean(query);

  // Direct canonical key match (user typed "burgers", "pizza", etc.)
  if (cleaned in FOOD_SYNONYMS) return cleaned;

  // Underscore-free canonical match (user typed "mac and cheese" for "mac_and_cheese")
  for (const canonical of Object.keys(FOOD_SYNONYMS)) {
    if (cleaned === canonical.replace(/_/g, " ")) return canonical;
  }

  // Substring against synonyms
  for (const [canonical, synonyms] of Object.entries(FOOD_SYNONYMS)) {
    for (const synonym of synonyms) {
      if (cleaned.includes(synonym) || synonym.includes(cleaned)) {
        return canonical;
      }
    }
  }

  // Fuzzy fallback
  let bestCanonical: string | null = null;
  let bestScore = 0;

  for (const [canonical, synonyms] of Object.entries(FOOD_SYNONYMS)) {
    for (const synonym of synonyms) {
      const sim = similarity(cleaned, synonym);
      if (sim > bestScore) {
        bestScore = sim;
        bestCanonical = canonical;
      }
    }
  }

  return bestScore >= 0.65 ? bestCanonical : null;
}

/**
 * Returns all canonical food keys that belong to the given category.
 *
 * Example: getCategoryFoods("breakfast") -> ["pancakes", "waffles", "eggs"]
 */
export function getCategoryFoods(category: string): string[] {
  const lowerCat = category.toLowerCase();
  return Object.entries(FOOD_CATEGORIES)
    .filter(([, cat]) => cat === lowerCat)
    .map(([food]) => food);
}
