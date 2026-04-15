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
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : pct >= 35
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-red-50 text-red-700 ring-red-200";

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
