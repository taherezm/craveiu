import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Returns the current meal period based on local hour. */
export function getCurrentMealPeriod(): "breakfast" | "lunch" | "dinner" | "latenight" | null {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 10) return "breakfast";
  if (hour >= 11 && hour < 14) return "lunch";
  if (hour >= 17 && hour < 20) return "dinner";
  if (hour >= 20 && hour < 23) return "latenight";
  return null;
}

/** Returns the next upcoming meal period, or the current one if serving. */
export function getNextMealPeriod(): { period: string; label: string; startsAt: string } {
  const hour = new Date().getHours();
  if (hour < 7) return { period: "breakfast", label: "Breakfast", startsAt: "7:00 AM" };
  if (hour < 10) return { period: "breakfast", label: "Breakfast", startsAt: "now" };
  if (hour < 11) return { period: "lunch", label: "Lunch", startsAt: "11:00 AM" };
  if (hour < 14) return { period: "lunch", label: "Lunch", startsAt: "now" };
  if (hour < 17) return { period: "dinner", label: "Dinner", startsAt: "5:00 PM" };
  if (hour < 20) return { period: "dinner", label: "Dinner", startsAt: "now" };
  if (hour < 23) return { period: "latenight", label: "Late Night", startsAt: "now" };
  return { period: "breakfast", label: "Breakfast", startsAt: "7:00 AM (tomorrow)" };
}

/** Format a date as "X minutes ago" / "X hours ago" etc. */
export function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Convert a string to a URL-safe slug. */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Clamp a number between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Map a score to a color class (green / yellow / red). */
export function scoreToColor(score: number, max = 100): "green" | "yellow" | "red" {
  const pct = max > 0 ? (score / max) * 100 : 0;
  if (pct >= 65) return "green";
  if (pct >= 35) return "yellow";
  return "red";
}
