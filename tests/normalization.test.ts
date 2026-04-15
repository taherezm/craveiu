import { describe, it, expect } from "vitest";
import {
  normalizeItem,
  findCanonicalFood,
  getCategoryFoods,
} from "@/lib/engine/normalization";

describe("normalizeItem", () => {
  const cases: [string, string][] = [
    ["Smashburger", "burgers"],
    ["Crispy Chicken Tenders", "chicken_tenders"],
    ["Buffalo Wings", "wings"],
    ["Applewood Smoked Bacon", "bacon"],
    ["Pepperoni Pizza", "pizza"],
    ["Belgian Waffles", "waffles"],
    ["Mac and Cheese", "mac_and_cheese"],
    ["Garden Salad", "salad"],
    ["Sweet Potato Fries", "fries"],
    ["Chocolate Chip Cookie", "cookies"],
    ["Scrambled Eggs", "eggs"],
    ["Buttermilk Pancakes", "pancakes"],
    ["Soft Serve Ice Cream", "soft_serve"],
    ["Mozzarella Sticks", "mozzarella_sticks"],
    ["Grilled Chicken Breast", "grilled_chicken"],
    ["Beef Stir Fry", "stir_fry"],
    ["Spaghetti Marinara", "pasta"],
    ["Chicken Noodle Soup", "soup"],
    ["Beef Tacos", "tacos"],
    ["Jasmine Rice", "rice"],
  ];

  for (const [input, expected] of cases) {
    it(`"${input}" → ${expected}`, () => {
      const result = normalizeItem(input);
      expect(result.canonicalFood).toBe(expected);
    });
  }

  it("returns confidence > 0.5 for known foods", () => {
    const result = normalizeItem("Chicken Tenders");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("returns low confidence for completely unknown items", () => {
    const result = normalizeItem("Xyzzy Blorgburple Surprise");
    expect(result.confidence).toBeLessThan(0.5);
    expect(result.canonicalFood).toBeNull();
  });

  it("is case-insensitive", () => {
    const lower = normalizeItem("crispy chicken tenders");
    const upper = normalizeItem("CRISPY CHICKEN TENDERS");
    expect(lower.canonicalFood).toBe(upper.canonicalFood);
  });

  it("sets normalizedName to lowercase trimmed input", () => {
    const result = normalizeItem("  Bacon Strips  ");
    expect(result.normalizedName).toBe("bacon strips");
  });
});

describe("findCanonicalFood", () => {
  it('maps "tenders" → chicken_tenders', () => {
    expect(findCanonicalFood("tenders")).toBe("chicken_tenders");
  });

  it('maps "burger" → burgers', () => {
    expect(findCanonicalFood("burger")).toBe("burgers");
  });

  it('maps "fries" → fries', () => {
    expect(findCanonicalFood("fries")).toBe("fries");
  });

  it('maps "wings" → wings', () => {
    expect(findCanonicalFood("wings")).toBe("wings");
  });

  it("returns null for unknown query", () => {
    expect(findCanonicalFood("blargblarg12345")).toBeNull();
  });
});

describe("getCategoryFoods", () => {
  it("breakfast category includes pancakes, waffles, eggs, bacon", () => {
    const foods = getCategoryFoods("breakfast");
    expect(foods).toContain("pancakes");
    expect(foods).toContain("waffles");
    expect(foods).toContain("eggs");
    expect(foods).toContain("bacon");
  });

  it("dessert category includes cookies, ice_cream, soft_serve", () => {
    const foods = getCategoryFoods("dessert");
    expect(foods).toContain("cookies");
    expect(foods).toContain("ice_cream");
    expect(foods).toContain("soft_serve");
  });

  it("returns empty array for unknown category", () => {
    expect(getCategoryFoods("nonexistent_category")).toEqual([]);
  });
});
