"use client";

import { cn } from "@/lib/utils";

export type FoodWeight = "must_have" | "nice_to_have" | "avoid" | null;

export interface FoodOption {
  name: string;
  emoji: string;
  category: string;
}

interface FoodSelectorProps {
  options: FoodOption[];
  values: Record<string, FoodWeight>;
  onChange: (name: string, weight: FoodWeight) => void;
}

const WEIGHT_CYCLE: (FoodWeight)[] = [null, "must_have", "nice_to_have", "avoid"];

const WEIGHT_STYLES: Record<NonNullable<FoodWeight>, { bg: string; text: string; label: string }> = {
  must_have: {
    bg: "bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400",
    text: "text-emerald-700",
    label: "Must have",
  },
  nice_to_have: {
    bg: "bg-blue-50 border-blue-400 ring-1 ring-blue-400",
    text: "text-blue-700",
    label: "Nice to have",
  },
  avoid: {
    bg: "bg-red-50 border-red-400 ring-1 ring-red-400",
    text: "text-red-700",
    label: "Avoid",
  },
};

export function FoodSelector({ options, values, onChange }: FoodSelectorProps) {
  const categories = [...new Set(options.map((o) => o.category))];

  function handleTap(name: string) {
    const current = values[name] ?? null;
    const idx = WEIGHT_CYCLE.indexOf(current);
    const next = WEIGHT_CYCLE[(idx + 1) % WEIGHT_CYCLE.length];
    onChange(name, next);
  }

  return (
    <div className="space-y-6">
      {categories.map((cat) => (
        <div key={cat}>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
            {cat}
          </h4>
          <div className="flex flex-wrap gap-2">
            {options
              .filter((o) => o.category === cat)
              .map((option) => {
                const weight = values[option.name] ?? null;
                const style = weight ? WEIGHT_STYLES[weight] : null;
                return (
                  <button
                    key={option.name}
                    type="button"
                    onClick={() => handleTap(option.name)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-95",
                      style?.bg,
                      style?.text,
                    )}
                  >
                    <span className="text-base leading-none">{option.emoji}</span>
                    <span>{option.name}</span>
                    {weight && (
                      <span className="ml-0.5 text-[10px] font-normal opacity-70">
                        · {WEIGHT_STYLES[weight].label}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
