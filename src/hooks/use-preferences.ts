"use client";

import { useState, useEffect, useCallback } from "react";

export interface FoodPreference {
  foodName: string;
  weight: "must_have" | "nice_to_have" | "avoid";
  category?: string;
}

export interface UserPreferences {
  foods: FoodPreference[];
  dietary: {
    vegetarian: boolean;
    vegan: boolean;
    highProtein: boolean;
    glutenFree: boolean;
  };
  updatedAt?: string;
}

const STORAGE_KEY = "craveiu_preferences";

const defaultPrefs: UserPreferences = {
  foods: [],
  dietary: { vegetarian: false, vegan: false, highProtein: false, glutenFree: false },
};

function load(): UserPreferences {
  if (typeof window === "undefined") return defaultPrefs;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrefs;
    return { ...defaultPrefs, ...JSON.parse(raw) };
  } catch {
    return defaultPrefs;
  }
}

function save(prefs: UserPreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...prefs, updatedAt: new Date().toISOString() }),
  );
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPrefs);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setPreferences(load());
    setIsLoading(false);
  }, []);

  const savePreferences = useCallback((prefs: UserPreferences) => {
    save(prefs);
    setPreferences(prefs);
  }, []);

  /** Toggle a food through: none → must_have → nice_to_have → avoid → none */
  const toggleFood = useCallback(
    (foodName: string, weight: "must_have" | "nice_to_have" | "avoid", category?: string) => {
      setPreferences((prev) => {
        const existing = prev.foods.find((f) => f.foodName === foodName);
        let updated: FoodPreference[];
        if (!existing) {
          updated = [...prev.foods, { foodName, weight, category }];
        } else if (existing.weight === weight) {
          updated = prev.foods.filter((f) => f.foodName !== foodName);
        } else {
          updated = prev.foods.map((f) =>
            f.foodName === foodName ? { ...f, weight } : f,
          );
        }
        const next = { ...prev, foods: updated };
        save(next);
        return next;
      });
    },
    [],
  );

  const removeFood = useCallback((foodName: string) => {
    setPreferences((prev) => {
      const next = { ...prev, foods: prev.foods.filter((f) => f.foodName !== foodName) };
      save(next);
      return next;
    });
  }, []);

  const setDietary = useCallback(
    (key: keyof UserPreferences["dietary"], value: boolean) => {
      setPreferences((prev) => {
        const next = { ...prev, dietary: { ...prev.dietary, [key]: value } };
        save(next);
        return next;
      });
    },
    [],
  );

  const hasPreferences = preferences.foods.length > 0;

  return {
    preferences,
    isLoading,
    hasPreferences,
    savePreferences,
    toggleFood,
    removeFood,
    setDietary,
  };
}
