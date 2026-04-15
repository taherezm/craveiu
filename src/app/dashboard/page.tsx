"use client";

import { useState } from "react";
import Link from "next/link";
import { RefreshCw, Settings2, Search, AlertCircle } from "lucide-react";
import { useMenus } from "@/hooks/use-menus";
import { usePreferences } from "@/hooks/use-preferences";
import { useRankings } from "@/hooks/use-rankings";
import { BestMatch } from "@/components/dashboard/best-match";
import { HallCard } from "@/components/dashboard/hall-card";
import { QuickFilters } from "@/components/dashboard/quick-filters";
import { MealPeriodIndicator } from "@/components/dashboard/meal-period-indicator";
import { SkeletonCard, SkeletonBestMatch } from "@/components/shared/skeleton-card";
import { formatTimeAgo, getCurrentMealPeriod } from "@/lib/utils";
import { DINING_HALLS } from "@/lib/constants";

const HALL_SLUGS: Record<string, string> = Object.fromEntries(
  DINING_HALLS.map((h) => [h.name.toLowerCase().replace(/\s+/g, "-"), h.slug]),
);

export default function DashboardPage() {
  const { menus, isLoading: menusLoading, error, lastUpdated, refresh } = useMenus();
  const { preferences, isLoading: prefsLoading, hasPreferences } = usePreferences();
  const [mealPeriod, setMealPeriod] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const effectivePeriod = mealPeriod ?? getCurrentMealPeriod() ?? "lunch";

  // Inject quick-filter foods into preference list for one-off searches
  const augmentedPrefs = { ...preferences };
  if (activeFilters.length > 0) {
    const filterFoods = activeFilters.map((f) => ({
      foodName: f,
      weight: "must_have" as const,
      category: undefined,
    }));
    augmentedPrefs.foods = [...preferences.foods, ...filterFoods.filter(
      (ff) => !preferences.foods.some((pf) => pf.foodName === ff.foodName),
    )];
  }

  const { rankings, bestMatch } = useRankings(menus, augmentedPrefs, effectivePeriod);

  const isLoading = menusLoading || prefsLoading;

  // Filter rankings by search
  const filteredRankings = searchQuery
    ? rankings.filter(
        (r) =>
          r.hallName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.matchedItems.some((item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      )
    : rankings;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Where should you eat?
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Ranked for{" "}
            <span className="font-medium capitalize">{effectivePeriod}</span>
            {lastUpdated && (
              <> · updated {formatTimeAgo(lastUpdated)}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={isLoading}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-40"
            title="Refresh menus"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/preferences"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50"
            title="Edit preferences"
          >
            <Settings2 className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Meal period selector */}
      <div className="mb-4">
        <MealPeriodIndicator />
      </div>

      {/* Quick filters */}
      <div className="mb-4">
        <QuickFilters onFilterChange={setActiveFilters} />
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search halls or foods…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-full border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/10"
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* No preferences CTA */}
      {!isLoading && !hasPreferences && activeFilters.length === 0 && (
        <div className="mb-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-sm font-medium text-gray-700">No preferences set yet.</p>
          <p className="mt-1 text-sm text-gray-500">
            Tell us what you crave to get personalized rankings.
          </p>
          <Link
            href="/preferences"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#990000] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#7a0000]"
          >
            Set my preferences
          </Link>
        </div>
      )}

      {/* Best match */}
      {isLoading ? (
        <SkeletonBestMatch />
      ) : bestMatch && (hasPreferences || activeFilters.length > 0) ? (
        <div className="animate-fade-in mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Best for you right now
          </p>
          <BestMatch
            hallName={bestMatch.hallName}
            score={bestMatch.totalScore}
            confidence={bestMatch.confidence}
            matchedItems={bestMatch.matchedItems.map((m) => m.name)}
            explanation={bestMatch.explanation}
            mealPeriod={bestMatch.mealPeriod}
          />
        </div>
      ) : null}

      {/* All halls ranked */}
      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          : filteredRankings.map((hall, index) => (
              <div key={hall.hallId} className={`animate-slide-up delay-${Math.min(index * 75, 300)}`}>
                <HallCard
                  hallId={hall.hallId}
                  hallName={hall.hallName}
                  slug={HALL_SLUGS[hall.hallId] ?? hall.hallId}
                  score={hall.totalScore}
                  matchedItems={hall.matchedItems.map((m) => m.name)}
                  mealPeriod={hall.mealPeriod}
                  rank={index + 1}
                />
              </div>
            ))}
        {!isLoading && filteredRankings.length === 0 && searchQuery && (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-500">No results for &quot;{searchQuery}&quot;</p>
          </div>
        )}
      </div>
    </div>
  );
}
