"use client";

import { useRef, useState, useCallback } from "react";
import {
  Beef,
  Drumstick,
  Flame,
  Egg,
  Leaf,
  Pizza,
  Cake,
  Dumbbell,
  Salad,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterOption {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const filters: FilterOption[] = [
  { id: "burgers", label: "Burgers", icon: <Beef className="h-4 w-4" /> },
  { id: "tenders", label: "Tenders", icon: <Drumstick className="h-4 w-4" /> },
  { id: "wings", label: "Wings", icon: <span className="text-sm">🍗</span> },
  { id: "bacon", label: "Bacon", icon: <span className="text-sm">🥓</span> },
  { id: "pizza", label: "Pizza", icon: <Pizza className="h-4 w-4" /> },
  { id: "dessert", label: "Dessert", icon: <Cake className="h-4 w-4" /> },
  { id: "high-protein", label: "High Protein", icon: <Dumbbell className="h-4 w-4" /> },
  { id: "vegetarian", label: "Vegetarian", icon: <Leaf className="h-4 w-4" /> },
  { id: "spicy", label: "Spicy", icon: <Flame className="h-4 w-4" /> },
  { id: "breakfast", label: "Breakfast", icon: <Egg className="h-4 w-4" /> },
  { id: "salad", label: "Salad", icon: <Salad className="h-4 w-4" /> },
];

interface QuickFiltersProps {
  onFilterChange: (activeFilters: string[]) => void;
}

export function QuickFilters({ onFilterChange }: QuickFiltersProps) {
  const [active, setActive] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(
    (id: string) => {
      setActive((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        onFilterChange(Array.from(next));
        return next;
      });
    },
    [onFilterChange]
  );

  return (
    <div className="relative">
      {/* Fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-6 bg-gradient-to-r from-white dark:from-zinc-900 to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-6 bg-gradient-to-l from-white dark:from-zinc-900 to-transparent" />

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scroll-smooth px-4 py-2 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {filters.map((filter) => {
          const isActive = active.has(filter.id);
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => toggle(filter.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-200 cursor-pointer",
                isActive
                  ? "border-[#990000] bg-[#990000] text-white shadow-sm"
                  : "border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-800"
              )}
            >
              {filter.icon}
              {filter.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
