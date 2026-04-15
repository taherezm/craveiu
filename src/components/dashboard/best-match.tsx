"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface BestMatchProps {
  hallName: string;
  score: number;
  confidence: number;
  matchedItems: string[];
  explanation: string;
  mealPeriod: string;
}

export function BestMatch({
  hallName,
  score,
  confidence,
  matchedItems,
  explanation,
  mealPeriod,
}: BestMatchProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-[#990000]/20 bg-gradient-to-br from-white dark:from-zinc-900 to-red-50/50 dark:to-zinc-900 transition-all duration-700 ease-out",
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0"
      )}
    >
      {/* Decorative accent */}
      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[#990000] to-[#cc3333]" />

      <CardHeader className="pb-3 pl-7">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Best Match
          </Badge>
          <Badge variant="outline">{mealPeriod}</Badge>
        </div>
        <CardTitle className="mt-2 text-2xl sm:text-3xl">{hallName}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5 pl-7">
        {/* Score */}
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <span className="text-4xl font-bold text-[#990000]">
              {score}%
            </span>
            <span className="text-sm text-gray-500 dark:text-zinc-400">
              {confidence}% confidence
            </span>
          </div>
          <Progress value={score} className="h-3" />
        </div>

        {/* Explanation */}
        <p className="text-sm leading-relaxed text-gray-600 dark:text-zinc-400">{explanation}</p>

        {/* Matched items */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
            Matched items
          </h4>
          <div className="flex flex-wrap gap-2">
            {matchedItems.map((item) => (
              <Badge key={item} variant="success" className="text-xs">
                {item}
              </Badge>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Button className="w-full gap-2 sm:w-auto">
          Go to menu
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
