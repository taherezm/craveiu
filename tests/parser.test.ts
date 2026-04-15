import { describe, it, expect } from "vitest";
import { parseRawMenu, parseRawMenus } from "@/lib/ingestion/parser";
import type { RawMenuData } from "@/lib/ingestion/adapter";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeRaw(overrides: Partial<RawMenuData> = {}): RawMenuData {
  return {
    hallName: "McNutt Dining Hall",
    date: "2025-09-15",
    mealPeriod: "lunch",
    stations: [
      {
        name: "Grill",
        items: [
          { name: "Crispy Chicken Tenders", calories: 320, protein: 28 },
          { name: "French Fries", calories: 290 },
          { name: "Smashburger", isVegetarian: false },
        ],
      },
      {
        name: "Dessert Station",
        items: [
          { name: "Chocolate Chip Cookie", isVegetarian: true },
          { name: "Soft Serve Ice Cream" },
        ],
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("parseRawMenu", () => {
  it("preserves station names", () => {
    const parsed = parseRawMenu(makeRaw());
    expect(parsed.stations.map((s) => s.name)).toEqual(["Grill", "Dessert Station"]);
  });

  it("normalizes item names", () => {
    const parsed = parseRawMenu(makeRaw());
    const grill = parsed.stations[0];
    const tenders = grill.items.find((i) => i.rawName === "Crispy Chicken Tenders")!;
    expect(tenders).toBeDefined();
    expect(tenders.canonicalFood).toBe("chicken_tenders");
    expect(tenders.confidence).toBeGreaterThan(0.5);
  });

  it("preserves nutrition data", () => {
    const parsed = parseRawMenu(makeRaw());
    const tenders = parsed.stations[0].items[0];
    expect(tenders.calories).toBe(320);
    expect(tenders.protein).toBe(28);
  });

  it("preserves dietary flags", () => {
    const parsed = parseRawMenu(makeRaw());
    const cookie = parsed.stations[1].items[0];
    expect(cookie.isVegetarian).toBe(true);
  });

  it("generates a sourceHash string", () => {
    const parsed = parseRawMenu(makeRaw());
    expect(typeof parsed.sourceHash).toBe("string");
    expect(parsed.sourceHash.length).toBe(16);
  });

  it("produces identical hashes for identical inputs", () => {
    const raw = makeRaw();
    const hash1 = parseRawMenu(raw).sourceHash;
    const hash2 = parseRawMenu(raw).sourceHash;
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different inputs", () => {
    const hash1 = parseRawMenu(makeRaw({ date: "2025-09-15" })).sourceHash;
    const hash2 = parseRawMenu(makeRaw({ date: "2025-09-16" })).sourceHash;
    expect(hash1).not.toBe(hash2);
  });

  it("calculates parseConfidence between 0 and 1", () => {
    const parsed = parseRawMenu(makeRaw());
    expect(parsed.parseConfidence).toBeGreaterThanOrEqual(0);
    expect(parsed.parseConfidence).toBeLessThanOrEqual(1);
  });

  it("counts low-confidence items correctly", () => {
    const raw = makeRaw({
      stations: [
        {
          name: "Mystery Station",
          items: [
            { name: "Xyzzy Blarg Surprise" },  // unknown
            { name: "Chicken Tenders" },        // known
          ],
        },
      ],
    });
    const parsed = parseRawMenu(raw);
    // At least the "Xyzzy" item should be low confidence
    expect(parsed.lowConfidenceCount).toBeGreaterThanOrEqual(1);
  });
});

describe("parseRawMenus", () => {
  it("parses multiple menus", () => {
    const raws: RawMenuData[] = [
      makeRaw({ hallName: "McNutt Dining Hall", mealPeriod: "lunch" }),
      makeRaw({ hallName: "Collins Eatery", mealPeriod: "breakfast" }),
    ];
    const parsed = parseRawMenus(raws);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].hallName).toBe("McNutt Dining Hall");
    expect(parsed[1].hallName).toBe("Collins Eatery");
  });
});
