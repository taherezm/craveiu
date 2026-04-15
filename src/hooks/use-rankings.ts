"use client";

import { useMemo } from "react";
import { rankHalls } from "@/lib/engine/ranking";
import type { HallRanking } from "@/lib/engine/ranking";
import type { RawMenuData } from "@/lib/ingestion/adapter";
import type { UserPreferences } from "./use-preferences";
import { getCurrentMealPeriod } from "@/lib/utils";

/** Convert raw menu data into the map shape expected by rankHalls */
function buildMenuMap(
  menus: RawMenuData[],
  mealPeriod: string,
): Map<string, { hallName: string; items: { name: string; mealPeriod: string; station: string }[] }> {
  const map = new Map<string, { hallName: string; items: { name: string; mealPeriod: string; station: string }[] }>();

  for (const menu of menus) {
    // "all_day" items (from the live CBORD adapter) are always included
    // regardless of which meal period is currently selected.
    if (
      menu.mealPeriod !== mealPeriod &&
      mealPeriod !== "all" &&
      menu.mealPeriod !== "all_day"
    ) continue;

    // Use slugified hall name as stable key
    const key = menu.hallName.toLowerCase().replace(/\s+/g, "-");
    if (!map.has(key)) {
      map.set(key, { hallName: menu.hallName, items: [] });
    }
    const entry = map.get(key)!;
    for (const station of menu.stations) {
      for (const item of station.items) {
        entry.items.push({
          name: item.name,
          mealPeriod: menu.mealPeriod,
          station: station.name,
        });
      }
    }
  }

  return map;
}

export function useRankings(
  menus: RawMenuData[],
  preferences: UserPreferences,
  filterPeriod?: string | null,
): { rankings: HallRanking[]; bestMatch: HallRanking | null } {
  return useMemo(() => {
    if (!menus.length) return { rankings: [], bestMatch: null };

    const period = filterPeriod ?? getCurrentMealPeriod() ?? "lunch";
    const menuMap = buildMenuMap(menus, period);

    const userPrefs = preferences.foods.map((f) => ({
      foodName: f.foodName,
      weight: f.weight,
    }));

    if (userPrefs.length === 0) {
      // No prefs: show all halls with score 0
      const rankings: HallRanking[] = [];
      for (const [hallId, { hallName }] of menuMap) {
        rankings.push({
          hallId,
          hallName,
          totalScore: 0,
          confidence: 0,
          matchedItems: [],
          avoidedItems: [],
          explanation: "Set your food preferences to get a personalized ranking.",
          mealPeriod: period,
        });
      }
      return { rankings, bestMatch: rankings[0] ?? null };
    }

    const rankings = rankHalls({ menusByHall: menuMap, userPreferences: userPrefs, currentMealPeriod: period });
    return { rankings, bestMatch: rankings[0] ?? null };
  }, [menus, preferences, filterPeriod]);
}
