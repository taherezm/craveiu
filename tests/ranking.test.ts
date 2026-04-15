import { describe, it, expect } from "vitest";
import { rankHalls } from "@/lib/engine/ranking";
import type { RankHallsParams } from "@/lib/engine/ranking";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeMenu(
  hallId: string,
  hallName: string,
  items: string[],
): [string, { hallName: string; items: { name: string; mealPeriod: string; station: string }[] }] {
  return [hallId, { hallName, items: items.map((name) => ({ name, mealPeriod: "lunch", station: "Grill" })) }];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("rankHalls", () => {
  it("ranks hall with matching must-have items highest", () => {
    const menusByHall = new Map([
      makeMenu("mcnutt", "McNutt", ["Crispy Chicken Tenders", "French Fries", "Cookies"]),
      makeMenu("forest", "Forest", ["Caesar Salad", "Soup"]),
      makeMenu("wright", "Wright", ["Pepperoni Pizza", "Breadsticks"]),
    ]);

    const params: RankHallsParams = {
      menusByHall,
      userPreferences: [
        { foodName: "chicken tenders", weight: "must_have" },
        { foodName: "fries", weight: "nice_to_have" },
      ],
      currentMealPeriod: "lunch",
    };

    const results = rankHalls(params);
    expect(results[0].hallName).toBe("McNutt");
    expect(results[0].totalScore).toBeGreaterThan(0);
  });

  it("penalizes halls with avoided items", () => {
    const menusByHall = new Map([
      makeMenu("collins", "Collins", ["Pepperoni Pizza", "Cheese Pizza", "Garlic Bread"]),
      makeMenu("mcnutt", "McNutt", ["Grilled Chicken", "Rice", "Salad"]),
    ]);

    const params: RankHallsParams = {
      menusByHall,
      userPreferences: [{ foodName: "pizza", weight: "avoid" }],
      currentMealPeriod: "lunch",
    };

    const results = rankHalls(params);
    const collins = results.find((r) => r.hallName === "Collins")!;
    const mcnutt  = results.find((r) => r.hallName === "McNutt")!;
    expect(collins.totalScore).toBeLessThan(mcnutt.totalScore);
    expect(collins.avoidedItems.length).toBeGreaterThan(0);
  });

  it("applies multiple-match bonus for 3+ matches", () => {
    const menusByHall = new Map([
      makeMenu("mcnutt", "McNutt", [
        "Chicken Tenders",
        "French Fries",
        "Chocolate Chip Cookies",
        "Crispy Bacon",
      ]),
    ]);

    const params: RankHallsParams = {
      menusByHall,
      userPreferences: [
        { foodName: "chicken tenders", weight: "nice_to_have" },
        { foodName: "fries", weight: "nice_to_have" },
        { foodName: "cookies", weight: "nice_to_have" },
        { foodName: "bacon", weight: "nice_to_have" },
      ],
      currentMealPeriod: "lunch",
    };

    const results = rankHalls(params);
    const mcnutt = results[0];
    // 4 nice_to_have (5pts each = 20) + multiple_match_bonus (3) = at least 23
    expect(mcnutt.totalScore).toBeGreaterThanOrEqual(23);
    expect(mcnutt.matchedItems.length).toBe(4);
  });

  it("returns confidence between 0 and 1", () => {
    const menusByHall = new Map([
      makeMenu("collins", "Collins", ["Pancakes", "Scrambled Eggs", "Bacon"]),
    ]);

    const results = rankHalls({
      menusByHall,
      userPreferences: [{ foodName: "pancakes", weight: "must_have" }],
      currentMealPeriod: "breakfast",
    });

    const conf = results[0].confidence;
    expect(conf).toBeGreaterThanOrEqual(0);
    expect(conf).toBeLessThanOrEqual(1);
  });

  it("returns equal scores for halls when no preferences are set", () => {
    const menusByHall = new Map([
      makeMenu("mcnutt", "McNutt", ["Burger", "Fries"]),
      makeMenu("wright", "Wright", ["Pizza", "Pasta"]),
    ]);

    const results = rankHalls({
      menusByHall,
      userPreferences: [],
      currentMealPeriod: "lunch",
    });

    expect(results.every((r) => r.totalScore === 0)).toBe(true);
  });

  it("includes hall name and food names in explanation", () => {
    const menusByHall = new Map([
      makeMenu("mcnutt", "McNutt", ["Chicken Tenders", "French Fries"]),
    ]);

    const results = rankHalls({
      menusByHall,
      userPreferences: [
        { foodName: "chicken tenders", weight: "must_have" },
        { foodName: "fries", weight: "nice_to_have" },
      ],
      currentMealPeriod: "lunch",
    });

    expect(results[0].explanation).toContain("McNutt");
    expect(results[0].explanation.length).toBeGreaterThan(20);
  });

  it("sorts halls by score descending", () => {
    const menusByHall = new Map([
      makeMenu("forest", "Forest", ["Salad"]),
      makeMenu("mcnutt", "McNutt", ["Chicken Tenders", "Fries", "Cookies", "Wings"]),
      makeMenu("collins", "Collins", ["Pancakes"]),
    ]);

    const results = rankHalls({
      menusByHall,
      userPreferences: [
        { foodName: "chicken tenders", weight: "must_have" },
        { foodName: "fries", weight: "must_have" },
        { foodName: "cookies", weight: "nice_to_have" },
      ],
      currentMealPeriod: "lunch",
    });

    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].totalScore).toBeGreaterThanOrEqual(results[i + 1].totalScore);
    }
  });
});
