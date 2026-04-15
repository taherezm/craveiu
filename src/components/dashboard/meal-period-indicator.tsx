"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type MealPeriod = "Breakfast" | "Lunch" | "Dinner" | "Late Night";

interface MealSchedule {
  period: MealPeriod;
  start: number; // hour in 24h
  end: number;
}

const schedule: MealSchedule[] = [
  { period: "Breakfast", start: 7, end: 10 },
  { period: "Lunch", start: 11, end: 14 },
  { period: "Dinner", start: 17, end: 21 },
  { period: "Late Night", start: 21, end: 24 },
];

function getCurrentPeriod(): {
  period: MealPeriod | null;
  minutesRemaining: number;
  isServing: boolean;
} {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  for (const s of schedule) {
    if (hour >= s.start && hour < s.end) {
      const remaining = (s.end - hour - 1) * 60 + (60 - minute);
      return { period: s.period, minutesRemaining: remaining, isServing: true };
    }
  }

  // Find next period
  for (const s of schedule) {
    if (hour < s.start) {
      const remaining = (s.start - hour - 1) * 60 + (60 - minute);
      return {
        period: s.period,
        minutesRemaining: remaining,
        isServing: false,
      };
    }
  }

  // After all periods, next is breakfast
  return {
    period: "Breakfast",
    minutesRemaining: (24 - hour + 7 - 1) * 60 + (60 - minute),
    isServing: false,
  };
}

function formatRemaining(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

export function MealPeriodIndicator() {
  const [info, setInfo] = useState(getCurrentPeriod);

  useEffect(() => {
    const interval = setInterval(() => {
      setInfo(getCurrentPeriod());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm shadow-sm">
      {/* Status dot */}
      <span className="relative flex h-2.5 w-2.5">
        {info.isServing && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={cn(
            "relative inline-flex h-2.5 w-2.5 rounded-full",
            info.isServing ? "bg-emerald-500" : "bg-gray-300"
          )}
        />
      </span>

      <span className="font-medium text-gray-900">
        {info.period ?? "Closed"}
      </span>

      <span className="flex items-center gap-1 text-gray-400">
        <Clock className="h-3.5 w-3.5" />
        <span className="text-xs">
          {info.isServing
            ? `${formatRemaining(info.minutesRemaining)} left`
            : `in ${formatRemaining(info.minutesRemaining)}`}
        </span>
      </span>
    </div>
  );
}
