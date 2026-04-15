import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ScoreBadge({ score, max = 100, size = "md", className }: ScoreBadgeProps) {
  const pct = max > 0 ? Math.min(100, Math.round((score / max) * 100)) : Math.min(100, Math.round(score));

  const colorClass =
    pct >= 65
      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 ring-emerald-200 dark:ring-emerald-800"
      : pct >= 35
        ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 ring-amber-200 dark:ring-amber-800"
        : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 ring-red-200 dark:ring-red-800";

  const sizeClass =
    size === "sm"
      ? "text-xs px-2 py-0.5"
      : size === "lg"
        ? "text-base px-4 py-1.5 font-bold"
        : "text-sm px-2.5 py-1";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold ring-1 ring-inset",
        colorClass,
        sizeClass,
        className,
      )}
    >
      {pct}%
    </span>
  );
}
