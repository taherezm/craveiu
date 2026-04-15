import { NextRequest, NextResponse } from "next/server";
import { MockAdapter } from "@/lib/ingestion/mock-adapter";
import { findCanonicalFood, normalizeItem } from "@/lib/engine/normalization";

const adapter = new MockAdapter();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: "Query too short" }, { status: 400 });
    }

    const canonical = findCanonicalFood(query);
    const menus = await adapter.fetchMenus(new Date());

    interface SearchResult {
      hallName: string;
      mealPeriod: string;
      stationName: string;
      itemName: string;
      confidence: number;
    }

    const results: SearchResult[] = [];

    for (const menu of menus) {
      for (const station of menu.stations) {
        for (const item of station.items) {
          const norm = normalizeItem(item.name);
          const matches =
            (canonical && norm.canonicalFood === canonical) ||
            item.name.toLowerCase().includes(query.toLowerCase()) ||
            (norm.normalizedName && norm.normalizedName.includes(query.toLowerCase()));

          if (matches) {
            results.push({
              hallName: menu.hallName,
              mealPeriod: menu.mealPeriod,
              stationName: station.name,
              itemName: item.name,
              confidence: norm.confidence,
            });
          }
        }
      }
    }

    // Sort by confidence desc
    results.sort((a, b) => b.confidence - a.confidence);

    return NextResponse.json({ query, canonical, results });
  } catch (err) {
    console.error("[/api/search]", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
