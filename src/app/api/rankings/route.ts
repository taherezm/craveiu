import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { MockAdapter } from "@/lib/ingestion/mock-adapter";
import { rankHalls } from "@/lib/engine/ranking";
import { getCurrentMealPeriod } from "@/lib/utils";

const PreferenceSchema = z.object({
  foodName: z.string().min(1),
  weight: z.enum(["must_have", "nice_to_have", "avoid"]),
});

const BodySchema = z.object({
  preferences: z.array(PreferenceSchema),
  mealPeriod: z.string().optional(),
  date: z.string().optional(),
});

const adapter = new MockAdapter();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.issues }, { status: 400 });
    }

    const { preferences, mealPeriod, date: dateParam } = parsed.data;
    const date = dateParam ? new Date(dateParam) : new Date();
    const period = mealPeriod ?? getCurrentMealPeriod() ?? "lunch";

    const rawMenus = await adapter.fetchMenus(date);

    // Build hall → items map for the requested meal period
    const menusByHall = new Map<string, { hallName: string; items: { name: string; mealPeriod: string; station: string }[] }>();
    for (const menu of rawMenus) {
      if (menu.mealPeriod !== period) continue;
      const key = menu.hallName.toLowerCase().replace(/\s+/g, "-");
      if (!menusByHall.has(key)) {
        menusByHall.set(key, { hallName: menu.hallName, items: [] });
      }
      const entry = menusByHall.get(key)!;
      for (const station of menu.stations) {
        for (const item of station.items) {
          entry.items.push({ name: item.name, mealPeriod: menu.mealPeriod, station: station.name });
        }
      }
    }

    const rankings = rankHalls({ menusByHall, userPreferences: preferences, currentMealPeriod: period });

    return NextResponse.json({ rankings, mealPeriod: period });
  } catch (err) {
    console.error("[/api/rankings]", err);
    return NextResponse.json({ error: "Failed to compute rankings" }, { status: 500 });
  }
}
