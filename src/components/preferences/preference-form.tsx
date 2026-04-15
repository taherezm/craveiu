"use client";

import { useState, useEffect } from "react";
import { FoodSelector, type FoodWeight } from "./food-selector";
import { usePreferences } from "@/hooks/use-preferences";
import { Switch } from "@/components/ui/switch";
import { Check } from "lucide-react";

const FOOD_OPTIONS = [
  { name: "burgers", emoji: "🍔", category: "Comfort Food" },
  { name: "chicken tenders", emoji: "🍗", category: "Comfort Food" },
  { name: "pizza", emoji: "🍕", category: "Comfort Food" },
  { name: "mac and cheese", emoji: "🧀", category: "Comfort Food" },
  { name: "wings", emoji: "🔥", category: "Comfort Food" },
  { name: "fries", emoji: "🍟", category: "Sides" },
  { name: "mozzarella sticks", emoji: "🧀", category: "Sides" },
  { name: "soup", emoji: "🍲", category: "Sides" },
  { name: "salad", emoji: "🥗", category: "Healthy" },
  { name: "grilled chicken", emoji: "🍗", category: "Protein" },
  { name: "stir fry", emoji: "🥘", category: "Protein" },
  { name: "rice", emoji: "🍚", category: "Protein" },
  { name: "tacos", emoji: "🌮", category: "International" },
  { name: "pasta", emoji: "🍝", category: "International" },
  { name: "bacon", emoji: "🥓", category: "Breakfast" },
  { name: "eggs", emoji: "🍳", category: "Breakfast" },
  { name: "pancakes", emoji: "🥞", category: "Breakfast" },
  { name: "waffles", emoji: "🧇", category: "Breakfast" },
  { name: "cookies", emoji: "🍪", category: "Dessert" },
  { name: "ice cream", emoji: "🍦", category: "Dessert" },
  { name: "soft serve", emoji: "🍦", category: "Dessert" },
];

export function PreferenceForm({ onSaved }: { onSaved?: () => void }) {
  const { preferences, savePreferences, isLoading } = usePreferences();
  const [foodValues, setFoodValues] = useState<Record<string, FoodWeight>>({});
  const [dietary, setDietary] = useState({
    vegetarian: false,
    vegan: false,
    highProtein: false,
    glutenFree: false,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      const vals: Record<string, FoodWeight> = {};
      for (const f of preferences.foods) {
        vals[f.foodName] = f.weight;
      }
      setFoodValues(vals);
      setDietary(preferences.dietary);
    }
  }, [isLoading, preferences]);

  function handleFoodChange(name: string, weight: FoodWeight) {
    setFoodValues((prev) => {
      if (weight === null) {
        const next = { ...prev };
        delete next[name];
        return next;
      }
      return { ...prev, [name]: weight };
    });
  }

  function handleSave() {
    const foods = Object.entries(foodValues)
      .filter(([, w]) => w !== null)
      .map(([foodName, weight]) => ({
        foodName,
        weight: weight as "must_have" | "nice_to_have" | "avoid",
        category: FOOD_OPTIONS.find((o) => o.name === foodName)?.category,
      }));

    savePreferences({ foods, dietary });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved?.();
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-1 text-sm text-gray-500">
          Tap once for <span className="font-semibold text-emerald-600">must have</span>, twice for{" "}
          <span className="font-semibold text-blue-600">nice to have</span>, three times for{" "}
          <span className="font-semibold text-red-600">avoid</span>, four times to clear.
        </p>
        <FoodSelector
          options={FOOD_OPTIONS}
          values={foodValues}
          onChange={handleFoodChange}
        />
      </div>

      {/* Dietary preferences */}
      <div>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-400">
          Dietary
        </h3>
        <div className="space-y-3">
          {(
            [
              { key: "vegetarian", label: "Vegetarian" },
              { key: "vegan", label: "Vegan" },
              { key: "highProtein", label: "High Protein" },
              { key: "glutenFree", label: "Gluten-Free" },
            ] as const
          ).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{label}</span>
              <Switch
                checked={dietary[key]}
                onCheckedChange={(v) => setDietary((d) => ({ ...d, [key]: v }))}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#990000] px-6 py-3.5 text-base font-semibold text-white shadow transition-all hover:bg-[#7a0000] active:scale-[0.98]"
      >
        {saved ? (
          <>
            <Check className="h-4 w-4" /> Saved!
          </>
        ) : (
          "Save preferences"
        )}
      </button>
    </div>
  );
}
