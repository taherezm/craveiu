/**
 * Mock menu ingestion adapter.
 *
 * Returns realistic IU Bloomington dining data for all five residential
 * dining halls. Each hall has a distinct "personality" that mirrors
 * real-world student perceptions:
 *
 *   Collins Eatery      - Best breakfast, solid basics
 *   Forest Dining Hall  - Most diverse / global options
 *   Goodbody Hall Eatery - Healthy-forward, good salads
 *   McNutt Dining Hall  - Comfort food heaven
 *   Wright Dining Hall  - Late-night favorite, pizza & grill
 *
 * Menu items rotate based on a seeded random derived from the date so that
 * successive calls for the same date are deterministic, yet different days
 * produce slightly different menus.
 */

import type {
  MenuIngestionAdapter,
  RawMenuData,
  RawMenuItemData,
  RawStationData,
} from "./adapter";

// ---------------------------------------------------------------------------
// Deterministic pseudo-random generator seeded from the date string
// ---------------------------------------------------------------------------

function dateHash(date: Date): number {
  const s = date.toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Simple linear-congruential PRNG so menus are stable per date. */
class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /** Returns a float in [0, 1). */
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) & 0x7fffffff;
    return this.state / 0x7fffffff;
  }

  /** Shuffle an array in place (Fisher-Yates). */
  shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Pick `n` random items from `arr` without replacement. */
  pick<T>(arr: T[], n: number): T[] {
    return this.shuffle(arr).slice(0, Math.min(n, arr.length));
  }
}

// ---------------------------------------------------------------------------
// Item pools (reusable across halls & stations)
// ---------------------------------------------------------------------------

const GRILL_ITEMS: RawMenuItemData[] = [
  { name: "Cheeseburger", calories: 550, protein: 30, allergens: ["dairy", "gluten"] },
  { name: "Hamburger", calories: 480, protein: 28, allergens: ["gluten"] },
  { name: "Black Bean Burger", isVegetarian: true, calories: 380, protein: 15, allergens: ["gluten"] },
  { name: "Grilled Chicken Sandwich", calories: 420, protein: 35, allergens: ["gluten"] },
  { name: "Hot Dog", calories: 350, protein: 12, allergens: ["gluten"] },
  { name: "Crispy Chicken Sandwich", calories: 510, protein: 26, allergens: ["gluten"] },
  { name: "Turkey Burger", calories: 400, protein: 30, allergens: ["gluten"] },
  { name: "Pulled Pork Sandwich", calories: 520, protein: 30, allergens: ["gluten"] },
  { name: "BBQ Bacon Cheeseburger", calories: 680, protein: 35, allergens: ["dairy", "gluten"] },
  { name: "Veggie Wrap", isVegetarian: true, isVegan: true, calories: 340, protein: 10, allergens: ["gluten"] },
];

const COMFORT_ITEMS: RawMenuItemData[] = [
  { name: "Chicken Tenders", calories: 450, protein: 25, allergens: ["gluten"] },
  { name: "Mac and Cheese", isVegetarian: true, calories: 420, protein: 15, allergens: ["dairy", "gluten"] },
  { name: "Meatball Sub", calories: 560, protein: 28, allergens: ["gluten", "dairy"] },
  { name: "Fried Chicken", calories: 480, protein: 32, allergens: ["gluten"] },
  { name: "Mozzarella Sticks", isVegetarian: true, calories: 400, protein: 16, allergens: ["dairy", "gluten"] },
  { name: "Onion Rings", isVegetarian: true, calories: 380, protein: 5, allergens: ["gluten"] },
  { name: "Chicken Quesadilla", calories: 450, protein: 26, allergens: ["dairy", "gluten"] },
  { name: "Corn Dog", calories: 350, protein: 10, allergens: ["gluten"] },
  { name: "Loaded Nachos", calories: 520, protein: 18, allergens: ["dairy"] },
  { name: "Chicken Parmesan", calories: 550, protein: 35, allergens: ["dairy", "gluten"] },
];

const GLOBAL_ITEMS: RawMenuItemData[] = [
  { name: "Chicken Stir Fry", calories: 380, protein: 28 },
  { name: "Beef Stir Fry", calories: 420, protein: 30 },
  { name: "Tofu Stir Fry", isVegetarian: true, isVegan: true, calories: 300, protein: 18 },
  { name: "Chicken Tacos", calories: 380, protein: 22 },
  { name: "Beef Tacos", calories: 420, protein: 24 },
  { name: "Chicken Tikka Masala", calories: 460, protein: 30, allergens: ["dairy"] },
  { name: "Vegetable Pad Thai", isVegetarian: true, isVegan: true, calories: 350, protein: 12, allergens: ["soy", "peanuts"] },
  { name: "Teriyaki Chicken Bowl", calories: 440, protein: 32, allergens: ["soy"] },
  { name: "Bibimbap", calories: 480, protein: 22, allergens: ["soy", "eggs"] },
  { name: "Falafel Plate", isVegetarian: true, isVegan: true, calories: 400, protein: 15 },
  { name: "Orange Chicken", calories: 500, protein: 26, allergens: ["soy", "gluten"] },
  { name: "Poke Bowl", calories: 420, protein: 28, allergens: ["fish", "soy"] },
];

const PIZZA_ITEMS: RawMenuItemData[] = [
  { name: "Cheese Pizza", isVegetarian: true, calories: 280, protein: 12, allergens: ["dairy", "gluten"] },
  { name: "Pepperoni Pizza", calories: 320, protein: 14, allergens: ["dairy", "gluten"] },
  { name: "Margherita Pizza", isVegetarian: true, calories: 270, protein: 11, allergens: ["dairy", "gluten"] },
  { name: "BBQ Chicken Pizza", calories: 340, protein: 16, allergens: ["dairy", "gluten"] },
  { name: "Veggie Supreme Pizza", isVegetarian: true, calories: 290, protein: 12, allergens: ["dairy", "gluten"] },
  { name: "Buffalo Chicken Pizza", calories: 350, protein: 18, allergens: ["dairy", "gluten"] },
  { name: "Meat Lovers Pizza", calories: 380, protein: 20, allergens: ["dairy", "gluten"] },
  { name: "Hawaiian Pizza", calories: 310, protein: 15, allergens: ["dairy", "gluten"] },
];

const PASTA_ITEMS: RawMenuItemData[] = [
  { name: "Spaghetti with Marinara", isVegetarian: true, calories: 380, protein: 12, allergens: ["gluten"] },
  { name: "Chicken Alfredo", calories: 520, protein: 28, allergens: ["dairy", "gluten"] },
  { name: "Penne alla Vodka", isVegetarian: true, calories: 450, protein: 14, allergens: ["dairy", "gluten"] },
  { name: "Baked Ziti", isVegetarian: true, calories: 420, protein: 16, allergens: ["dairy", "gluten"] },
  { name: "Lasagna", calories: 480, protein: 22, allergens: ["dairy", "gluten"] },
  { name: "Garlic Butter Pasta", isVegetarian: true, calories: 400, protein: 10, allergens: ["dairy", "gluten"] },
  { name: "Pasta Primavera", isVegetarian: true, calories: 360, protein: 11, allergens: ["gluten"] },
];

const DELI_ITEMS: RawMenuItemData[] = [
  { name: "Turkey Club Sandwich", calories: 480, protein: 30, allergens: ["gluten"] },
  { name: "Ham and Swiss Panini", calories: 450, protein: 26, allergens: ["dairy", "gluten"] },
  { name: "BLT Sandwich", calories: 400, protein: 18, allergens: ["gluten"] },
  { name: "Veggie Hummus Wrap", isVegetarian: true, isVegan: true, calories: 340, protein: 12, allergens: ["gluten"] },
  { name: "Italian Sub", calories: 520, protein: 24, allergens: ["dairy", "gluten"] },
  { name: "Tuna Salad Sandwich", calories: 420, protein: 22, allergens: ["fish", "gluten"] },
  { name: "Grilled Cheese", isVegetarian: true, calories: 380, protein: 14, allergens: ["dairy", "gluten"] },
];

const SALAD_ITEMS: RawMenuItemData[] = [
  { name: "Caesar Salad", isVegetarian: true, calories: 250, protein: 8, allergens: ["dairy", "gluten"] },
  { name: "Garden Salad", isVegetarian: true, isVegan: true, isGlutenFree: true, calories: 80, protein: 3 },
  { name: "Grilled Chicken Caesar Salad", calories: 380, protein: 32, allergens: ["dairy", "gluten"] },
  { name: "Greek Salad", isVegetarian: true, isGlutenFree: true, calories: 200, protein: 6, allergens: ["dairy"] },
  { name: "Southwest Chicken Salad", calories: 420, protein: 28 },
  { name: "Spinach Strawberry Salad", isVegetarian: true, isVegan: true, isGlutenFree: true, calories: 180, protein: 4 },
  { name: "Asian Sesame Chicken Salad", calories: 360, protein: 24, allergens: ["soy"] },
  { name: "Cobb Salad", calories: 440, protein: 30, allergens: ["dairy", "eggs"] },
];

const SOUP_ITEMS: RawMenuItemData[] = [
  { name: "Tomato Soup", isVegetarian: true, isVegan: true, isGlutenFree: true, calories: 180, protein: 4 },
  { name: "Chicken Noodle Soup", calories: 220, protein: 14, allergens: ["gluten"] },
  { name: "Broccoli Cheddar Soup", isVegetarian: true, calories: 280, protein: 10, allergens: ["dairy", "gluten"] },
  { name: "Chili", isGlutenFree: true, calories: 320, protein: 22 },
  { name: "Minestrone", isVegetarian: true, isVegan: true, calories: 160, protein: 6, allergens: ["gluten"] },
  { name: "Loaded Baked Potato Soup", isVegetarian: true, calories: 340, protein: 8, allergens: ["dairy"] },
  { name: "French Onion Soup", isVegetarian: true, calories: 300, protein: 10, allergens: ["dairy", "gluten"] },
];

const SIDES_ITEMS: RawMenuItemData[] = [
  { name: "French Fries", isVegetarian: true, isVegan: true, isGlutenFree: true, calories: 340, protein: 4 },
  { name: "Mashed Potatoes", isVegetarian: true, calories: 220, protein: 4, allergens: ["dairy"] },
  { name: "Steamed Broccoli", isVegetarian: true, isVegan: true, isGlutenFree: true, calories: 55, protein: 4 },
  { name: "Steamed Rice", isVegetarian: true, isVegan: true, isGlutenFree: true, calories: 210, protein: 4 },
  { name: "Roasted Vegetables", isVegetarian: true, isVegan: true, isGlutenFree: true, calories: 120, protein: 3 },
  { name: "Corn on the Cob", isVegetarian: true, isVegan: true, isGlutenFree: true, calories: 130, protein: 4 },
  { name: "Baked Beans", isVegetarian: true, isVegan: true, isGlutenFree: true, calories: 190, protein: 8 },
  { name: "Coleslaw", isVegetarian: true, calories: 150, protein: 1, allergens: ["eggs"] },
  { name: "Sweet Potato Fries", isVegetarian: true, isVegan: true, calories: 300, protein: 3 },
  { name: "Tater Tots", isVegetarian: true, isVegan: true, calories: 320, protein: 3 },
];

const BREAKFAST_ITEMS: RawMenuItemData[] = [
  { name: "Scrambled Eggs", isVegetarian: true, isGlutenFree: true, calories: 180, protein: 14, allergens: ["eggs"] },
  { name: "Bacon", isGlutenFree: true, calories: 120, protein: 10 },
  { name: "Sausage Links", isGlutenFree: true, calories: 200, protein: 12 },
  { name: "Pancakes", isVegetarian: true, calories: 350, protein: 8, allergens: ["gluten", "dairy", "eggs"] },
  { name: "Waffles", isVegetarian: true, calories: 380, protein: 9, allergens: ["gluten", "dairy", "eggs"] },
  { name: "French Toast", isVegetarian: true, calories: 340, protein: 10, allergens: ["gluten", "dairy", "eggs"] },
  { name: "Hash Browns", isVegetarian: true, isVegan: true, isGlutenFree: true, calories: 200, protein: 3 },
  { name: "Oatmeal", isVegetarian: true, isVegan: true, calories: 160, protein: 6 },
  { name: "Yogurt Parfait", isVegetarian: true, calories: 220, protein: 10, allergens: ["dairy"] },
  { name: "Breakfast Burrito", calories: 480, protein: 22, allergens: ["dairy", "gluten", "eggs"] },
  { name: "Egg and Cheese Biscuit", isVegetarian: true, calories: 380, protein: 16, allergens: ["dairy", "gluten", "eggs"] },
  { name: "Veggie Omelet", isVegetarian: true, isGlutenFree: true, calories: 240, protein: 18, allergens: ["eggs", "dairy"] },
  { name: "Blueberry Muffin", isVegetarian: true, calories: 320, protein: 5, allergens: ["gluten", "dairy", "eggs"] },
  { name: "Cinnamon Roll", isVegetarian: true, calories: 420, protein: 6, allergens: ["gluten", "dairy", "eggs"] },
  { name: "Fresh Fruit Cup", isVegetarian: true, isVegan: true, isGlutenFree: true, calories: 80, protein: 1 },
];

const DESSERT_ITEMS: RawMenuItemData[] = [
  { name: "Chocolate Chip Cookies", isVegetarian: true, calories: 220, protein: 3, allergens: ["gluten", "dairy", "eggs"] },
  { name: "Brownies", isVegetarian: true, calories: 280, protein: 4, allergens: ["gluten", "dairy", "eggs"] },
  { name: "Soft Serve Ice Cream", isVegetarian: true, calories: 200, protein: 4, allergens: ["dairy"] },
  { name: "Chocolate Cake", isVegetarian: true, calories: 350, protein: 5, allergens: ["gluten", "dairy", "eggs"] },
  { name: "Apple Pie", isVegetarian: true, calories: 300, protein: 3, allergens: ["gluten", "dairy"] },
  { name: "Rice Krispie Treat", isVegetarian: true, calories: 180, protein: 2, allergens: ["dairy"] },
  { name: "Fruit Cup", isVegetarian: true, isVegan: true, isGlutenFree: true, calories: 80, protein: 1 },
  { name: "Sugar Cookie", isVegetarian: true, calories: 200, protein: 2, allergens: ["gluten", "dairy", "eggs"] },
  { name: "Banana Pudding", isVegetarian: true, calories: 260, protein: 4, allergens: ["dairy"] },
  { name: "Peach Cobbler", isVegetarian: true, calories: 300, protein: 3, allergens: ["gluten", "dairy"] },
];

const HOMESTYLE_ITEMS: RawMenuItemData[] = [
  { name: "Grilled Chicken Breast", isGlutenFree: true, calories: 280, protein: 40 },
  { name: "Baked Salmon", isGlutenFree: true, calories: 350, protein: 38, allergens: ["fish"] },
  { name: "Meatloaf", calories: 420, protein: 25, allergens: ["gluten", "eggs"] },
  { name: "Roast Beef", isGlutenFree: true, calories: 380, protein: 35 },
  { name: "BBQ Pulled Pork", isGlutenFree: true, calories: 400, protein: 28 },
  { name: "Herb Roasted Chicken", isGlutenFree: true, calories: 320, protein: 36 },
  { name: "Pot Roast with Gravy", calories: 450, protein: 32, allergens: ["gluten"] },
  { name: "Baked Chicken Thighs", isGlutenFree: true, calories: 340, protein: 28 },
];

// ---------------------------------------------------------------------------
// Hall configurations — each hall has a distinct personality
// ---------------------------------------------------------------------------

interface HallConfig {
  name: string;
  slug: string;
  /** Station pools for each meal period. Order matters for station sequencing. */
  breakfast: StationConfig[];
  lunch: StationConfig[];
  dinner: StationConfig[];
}

interface StationConfig {
  stationName: string;
  pool: RawMenuItemData[];
  /** How many items to pick from the pool. */
  count: number;
}

const HALL_CONFIGS: HallConfig[] = [
  // ─── Collins Eatery: best breakfast, solid basics ──────────────────────
  {
    name: "Collins Eatery",
    slug: "collins",
    breakfast: [
      { stationName: "Breakfast Bar", pool: BREAKFAST_ITEMS, count: 7 },
      { stationName: "Grill", pool: GRILL_ITEMS, count: 3 },
      { stationName: "Bakery", pool: [...DESSERT_ITEMS.filter((i) => i.name.includes("Muffin") || i.name.includes("Cookie") || i.name.includes("Cinnamon")), ...BREAKFAST_ITEMS.filter((i) => i.name.includes("Fruit"))], count: 3 },
    ],
    lunch: [
      { stationName: "Grill", pool: GRILL_ITEMS, count: 4 },
      { stationName: "Deli", pool: DELI_ITEMS, count: 4 },
      { stationName: "Salad Bar", pool: SALAD_ITEMS, count: 4 },
      { stationName: "Sides", pool: SIDES_ITEMS, count: 4 },
      { stationName: "Dessert Station", pool: DESSERT_ITEMS, count: 3 },
    ],
    dinner: [
      { stationName: "Grill", pool: GRILL_ITEMS, count: 4 },
      { stationName: "Comfort", pool: COMFORT_ITEMS, count: 4 },
      { stationName: "Salad Bar", pool: SALAD_ITEMS, count: 3 },
      { stationName: "Sides", pool: SIDES_ITEMS, count: 4 },
      { stationName: "Dessert Station", pool: DESSERT_ITEMS, count: 3 },
    ],
  },

  // ─── Forest Dining Hall: most diverse / global options ─────────────────
  {
    name: "Forest Dining Hall",
    slug: "forest",
    breakfast: [
      { stationName: "Breakfast Bar", pool: BREAKFAST_ITEMS, count: 6 },
      { stationName: "Global", pool: GLOBAL_ITEMS.filter((i) => i.isVegetarian || i.isVegan), count: 3 },
      { stationName: "Bakery", pool: DESSERT_ITEMS, count: 2 },
    ],
    lunch: [
      { stationName: "Global", pool: GLOBAL_ITEMS, count: 5 },
      { stationName: "Grill", pool: GRILL_ITEMS, count: 3 },
      { stationName: "Pasta", pool: PASTA_ITEMS, count: 3 },
      { stationName: "Salad Bar", pool: SALAD_ITEMS, count: 4 },
      { stationName: "Dessert Station", pool: DESSERT_ITEMS, count: 3 },
    ],
    dinner: [
      { stationName: "Global", pool: GLOBAL_ITEMS, count: 5 },
      { stationName: "Homestyle", pool: HOMESTYLE_ITEMS, count: 4 },
      { stationName: "Salad Bar", pool: SALAD_ITEMS, count: 4 },
      { stationName: "Soup Station", pool: SOUP_ITEMS, count: 3 },
      { stationName: "Dessert Station", pool: DESSERT_ITEMS, count: 3 },
    ],
  },

  // ─── Goodbody Hall Eatery: healthy-forward, good salads ────────────────
  {
    name: "Goodbody Hall Eatery",
    slug: "goodbody",
    breakfast: [
      { stationName: "Breakfast Bar", pool: BREAKFAST_ITEMS.filter((i) => i.isVegetarian || i.calories! < 300), count: 6 },
      { stationName: "Smoothie & Fruit", pool: [
        { name: "Fresh Fruit Cup", isVegetarian: true, isVegan: true, isGlutenFree: true, calories: 80, protein: 1 },
        { name: "Yogurt Parfait", isVegetarian: true, calories: 220, protein: 10, allergens: ["dairy"] },
        { name: "Oatmeal", isVegetarian: true, isVegan: true, calories: 160, protein: 6 },
        { name: "Granola with Almond Milk", isVegetarian: true, isVegan: true, calories: 240, protein: 7, allergens: ["tree nuts"] },
        { name: "Acai Bowl", isVegetarian: true, isVegan: true, calories: 300, protein: 5 },
      ], count: 4 },
      { stationName: "Bakery", pool: DESSERT_ITEMS, count: 2 },
    ],
    lunch: [
      { stationName: "Salad Bar", pool: SALAD_ITEMS, count: 5 },
      { stationName: "Soup Station", pool: SOUP_ITEMS, count: 3 },
      { stationName: "Grill", pool: GRILL_ITEMS.filter((i) => i.isVegetarian || i.name.includes("Chicken") || i.name.includes("Turkey")), count: 3 },
      { stationName: "Sides", pool: SIDES_ITEMS.filter((i) => i.isVegetarian), count: 4 },
      { stationName: "Dessert Station", pool: DESSERT_ITEMS.filter((i) => i.calories! <= 220), count: 3 },
    ],
    dinner: [
      { stationName: "Homestyle", pool: HOMESTYLE_ITEMS, count: 4 },
      { stationName: "Salad Bar", pool: SALAD_ITEMS, count: 5 },
      { stationName: "Global", pool: GLOBAL_ITEMS.filter((i) => i.isVegetarian || i.isVegan), count: 3 },
      { stationName: "Sides", pool: SIDES_ITEMS, count: 4 },
    ],
  },

  // ─── McNutt Dining Hall: comfort food heaven ──────────────────────────
  {
    name: "McNutt Dining Hall",
    slug: "mcnutt",
    breakfast: [
      { stationName: "Breakfast Bar", pool: BREAKFAST_ITEMS, count: 6 },
      { stationName: "Grill", pool: GRILL_ITEMS, count: 2 },
      { stationName: "Bakery", pool: DESSERT_ITEMS, count: 3 },
    ],
    lunch: [
      { stationName: "Comfort", pool: COMFORT_ITEMS, count: 5 },
      { stationName: "Grill", pool: GRILL_ITEMS, count: 4 },
      { stationName: "Pizza", pool: PIZZA_ITEMS, count: 4 },
      { stationName: "Sides", pool: SIDES_ITEMS, count: 4 },
      { stationName: "Dessert Station", pool: DESSERT_ITEMS, count: 4 },
    ],
    dinner: [
      { stationName: "Comfort", pool: COMFORT_ITEMS, count: 5 },
      { stationName: "Grill", pool: GRILL_ITEMS, count: 4 },
      { stationName: "Pasta", pool: PASTA_ITEMS, count: 3 },
      { stationName: "Homestyle", pool: HOMESTYLE_ITEMS, count: 3 },
      { stationName: "Dessert Station", pool: DESSERT_ITEMS, count: 4 },
    ],
  },

  // ─── Wright Dining Hall: late-night favorite, pizza & grill ────────────
  {
    name: "Wright Dining Hall",
    slug: "wright",
    breakfast: [
      { stationName: "Breakfast Bar", pool: BREAKFAST_ITEMS, count: 5 },
      { stationName: "Grill", pool: GRILL_ITEMS, count: 3 },
      { stationName: "Bakery", pool: DESSERT_ITEMS, count: 2 },
    ],
    lunch: [
      { stationName: "Pizza", pool: PIZZA_ITEMS, count: 5 },
      { stationName: "Grill", pool: GRILL_ITEMS, count: 5 },
      { stationName: "Deli", pool: DELI_ITEMS, count: 3 },
      { stationName: "Salad Bar", pool: SALAD_ITEMS, count: 3 },
      { stationName: "Dessert Station", pool: DESSERT_ITEMS, count: 3 },
    ],
    dinner: [
      { stationName: "Pizza", pool: PIZZA_ITEMS, count: 5 },
      { stationName: "Grill", pool: GRILL_ITEMS, count: 5 },
      { stationName: "Comfort", pool: COMFORT_ITEMS, count: 4 },
      { stationName: "Sides", pool: SIDES_ITEMS, count: 4 },
      { stationName: "Dessert Station", pool: DESSERT_ITEMS, count: 4 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Build stations for a meal from a config
// ---------------------------------------------------------------------------

function buildStations(
  configs: StationConfig[],
  rng: SeededRandom,
): RawStationData[] {
  return configs.map(({ stationName, pool, count }) => ({
    name: stationName,
    items: rng.pick(pool, count),
  }));
}

// ---------------------------------------------------------------------------
// MockAdapter
// ---------------------------------------------------------------------------

export class MockAdapter implements MenuIngestionAdapter {
  getSourceName(): string {
    return "Mock IU Dining Data";
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async fetchMenus(date: Date): Promise<RawMenuData[]> {
    const seed = dateHash(date);
    const isoDate = date.toISOString().slice(0, 10);
    const results: RawMenuData[] = [];

    for (const hall of HALL_CONFIGS) {
      const meals = [
        { period: "breakfast", stations: hall.breakfast },
        { period: "lunch", stations: hall.lunch },
        { period: "dinner", stations: hall.dinner },
      ] as const;

      for (const { period, stations } of meals) {
        // Create a unique seed per hall + meal so each one shuffles differently
        const mealSeed = seed ^ (hall.slug.length * 997) ^ (period.charCodeAt(0) * 31);
        const rng = new SeededRandom(mealSeed);

        results.push({
          hallName: hall.name,
          date: isoDate,
          mealPeriod: period,
          stations: buildStations(stations, rng),
        });
      }
    }

    return results;
  }
}
