/**
 * Menu parser — converts RawMenuData into normalized ParsedMenu structures.
 *
 * Responsibilities:
 *  - Run each item through the normalization engine
 *  - Produce a stable sourceHash to detect duplicate snapshots
 *  - Track overall parse confidence per menu
 */

import { createHash } from "crypto";
import { normalizeItem } from "../engine/normalization";
import type { RawMenuData, RawMenuItemData } from "./adapter";

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface ParsedMenuItem {
  rawName: string;
  normalizedName: string;
  canonicalFood: string | null;
  category: string | null;
  confidence: number;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isHalal?: boolean;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sodium?: number;
  fiber?: number;
  allergens?: string[];
}

export interface ParsedStation {
  name: string;
  items: ParsedMenuItem[];
}

export interface ParsedMenu {
  hallName: string;
  date: string;
  mealPeriod: string;
  stations: ParsedStation[];
  /** SHA-256 of the raw content — used to skip duplicate ingestion. */
  sourceHash: string;
  /** Average confidence across all items (0-1). */
  parseConfidence: number;
  /** Number of items that failed to normalize (confidence < 0.3). */
  lowConfidenceCount: number;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

export function parseRawMenu(raw: RawMenuData): ParsedMenu {
  const stations: ParsedStation[] = [];
  const confidences: number[] = [];

  for (const rawStation of raw.stations) {
    const parsedItems: ParsedMenuItem[] = rawStation.items.map((item) =>
      parseItem(item, confidences),
    );
    stations.push({ name: rawStation.name, items: parsedItems });
  }

  const avg =
    confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

  const lowConfidenceCount = confidences.filter((c) => c < 0.3).length;

  return {
    hallName: raw.hallName,
    date: raw.date,
    mealPeriod: raw.mealPeriod,
    stations,
    sourceHash: computeHash(raw),
    parseConfidence: Math.round(avg * 1000) / 1000,
    lowConfidenceCount,
  };
}

export function parseRawMenus(raws: RawMenuData[]): ParsedMenu[] {
  return raws.map(parseRawMenu);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseItem(item: RawMenuItemData, confidences: number[]): ParsedMenuItem {
  const norm = normalizeItem(item.name);
  confidences.push(norm.confidence);

  return {
    rawName: item.name,
    normalizedName: norm.normalizedName,
    canonicalFood: norm.canonicalFood,
    category: norm.category,
    confidence: norm.confidence,
    isVegetarian: item.isVegetarian,
    isVegan: item.isVegan,
    isGlutenFree: item.isGlutenFree,
    isHalal: item.isHalal,
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    sodium: item.sodium,
    fiber: item.fiber,
    allergens: item.allergens,
  };
}

/**
 * Produces a deterministic hash of the raw menu content.
 * Two menus with identical hall / date / mealPeriod / items hash to the same
 * value, making it safe to skip re-ingestion.
 */
function computeHash(raw: RawMenuData): string {
  const content = JSON.stringify({
    hallName: raw.hallName,
    date: raw.date,
    mealPeriod: raw.mealPeriod,
    stations: raw.stations.map((s) => ({
      name: s.name,
      items: s.items.map((i) => i.name).sort(),
    })),
  });
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}
