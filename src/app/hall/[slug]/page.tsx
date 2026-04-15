"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock } from "lucide-react";
import { useMenus } from "@/hooks/use-menus";
import { usePreferences } from "@/hooks/use-preferences";
import { normalizeItem } from "@/lib/engine/normalization";
import { DINING_HALLS, MEAL_PERIODS } from "@/lib/constants";
import { getCurrentMealPeriod } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { RawMenuData } from "@/lib/ingestion/adapter";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const PERIOD_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  latenight: "Late Night",
};

export default function HallDetailPage({ params }: PageProps) {
  const { slug } = use(params);
  const { menus, isLoading } = useMenus();
  const { preferences } = usePreferences();
  const [activePeriod, setActivePeriod] = useState<string>(
    getCurrentMealPeriod() ?? "lunch",
  );

  const hall = DINING_HALLS.find((h) => h.slug === slug);
  const preferredFoods = new Set(
    preferences.foods
      .filter((f) => f.weight !== "avoid")
      .map((f) => f.foodName.toLowerCase()),
  );

  // Get menus for this hall
  const hallMenus: RawMenuData[] = menus.filter(
    (m) => m.hallName.toLowerCase() === (hall?.name.toLowerCase() ?? ""),
  );

  const currentMenu = hallMenus.find((m) => m.mealPeriod === activePeriod);

  if (!hall) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-gray-500">Hall not found.</p>
        <Link href="/dashboard" className="mt-4 text-[#990000] hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to rankings
      </Link>

      {/* Hall header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{hall.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {hall.location}
          </span>
        </div>
        {hall.description && (
          <p className="mt-2 text-sm text-gray-600">{hall.description}</p>
        )}
      </div>

      {/* Meal period tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1">
        {MEAL_PERIODS.map((period) => (
          <button
            key={period.key}
            onClick={() => setActivePeriod(period.key)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition-all",
              activePeriod === period.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Menu content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5">
              <div className="mb-3 h-4 w-32 rounded bg-gray-100" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-3 w-full rounded bg-gray-100" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : currentMenu ? (
        <div className="space-y-4">
          {currentMenu.stations.map((station) => (
            <div
              key={station.name}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
                {station.name}
              </h3>
              <ul className="space-y-1.5">
                {station.items.map((item, idx) => {
                  const norm = normalizeItem(item.name);
                  const isMatch = norm.canonicalFood
                    ? preferredFoods.has(norm.canonicalFood) || preferredFoods.has(item.name.toLowerCase())
                    : preferredFoods.has(item.name.toLowerCase());

                  return (
                    <li
                      key={idx}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-2 py-1.5 text-sm",
                        isMatch ? "bg-emerald-50" : "hover:bg-gray-50",
                      )}
                    >
                      <span className={cn("font-medium", isMatch ? "text-emerald-800" : "text-gray-800")}>
                        {isMatch && <span className="mr-1.5">★</span>}
                        {item.name}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        {item.isVegetarian && (
                          <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                            V
                          </span>
                        )}
                        {item.isVegan && (
                          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800">
                            VG
                          </span>
                        )}
                        {item.calories != null && (
                          <span className="text-xs text-gray-400">{item.calories} cal</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
          <Clock className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">
            No menu available for {PERIOD_LABELS[activePeriod]}.
          </p>
        </div>
      )}
    </div>
  );
}
