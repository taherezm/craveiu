import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScoreBadge } from "@/components/shared/score-badge";
import { cn } from "@/lib/utils";

interface HallCardProps {
  hallId: string;
  hallName: string;
  slug: string;
  score: number;
  matchedItems: string[];
  mealPeriod: string;
  rank: number;
}

export function HallCard({
  hallName,
  slug,
  score,
  matchedItems,
  mealPeriod,
  rank,
}: HallCardProps) {
  return (
    <Link href={`/hall/${slug}`} className="group block">
      <Card className="transition-all duration-200 group-hover:shadow-lg group-hover:border-gray-200">
        <CardContent className="flex items-center gap-4 p-4 sm:p-5">
          {/* Rank */}
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
              rank === 1
                ? "bg-[#990000] text-white"
                : rank === 2
                  ? "bg-gray-800 text-white"
                  : rank === 3
                    ? "bg-amber-600 text-white"
                    : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400"
            )}
          >
            #{rank}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-base font-semibold text-gray-900 dark:text-white">
                {hallName}
              </h3>
              <ScoreBadge score={score} />
            </div>

            <Progress value={score} className="h-1.5" />

            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] px-2 py-0">
                {mealPeriod}
              </Badge>
              {matchedItems.slice(0, 3).map((item) => (
                <Badge
                  key={item}
                  variant="secondary"
                  className="text-[10px] px-2 py-0"
                >
                  {item}
                </Badge>
              ))}
              {matchedItems.length > 3 && (
                <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                  +{matchedItems.length - 3} more
                </span>
              )}
            </div>
          </div>

          {/* Arrow */}
          <ChevronRight className="h-5 w-5 shrink-0 text-gray-300 dark:text-zinc-600 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-gray-500 dark:group-hover:text-zinc-400" />
        </CardContent>
      </Card>
    </Link>
  );
}
