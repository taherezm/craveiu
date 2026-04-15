import { NextRequest, NextResponse } from "next/server";
import { MockAdapter } from "@/lib/ingestion/mock-adapter";
import { IUDiningAdapter } from "@/lib/ingestion/iu-dining-adapter";
import type { RawMenuData } from "@/lib/ingestion/adapter";

// ---------------------------------------------------------------------------
// Adapter selection
// ---------------------------------------------------------------------------
// Set ENABLE_REAL_INGESTION=true in .env.local to use live IU Dining data.
// Falls back to deterministic mock data when false or unset.

const useRealData = process.env.ENABLE_REAL_INGESTION === "true";

// Module-level singletons so sessions / caches persist between requests.
const mockAdapter = new MockAdapter();
const realAdapter = new IUDiningAdapter();

const adapter = useRealData ? realAdapter : mockAdapter;

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const hallParam = searchParams.get("hall");
    const mealParam = searchParams.get("meal");

    const date = dateParam ? new Date(dateParam) : new Date();
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    let menus: RawMenuData[] = await adapter.fetchMenus(date);

    // Filter by hall slug if requested
    if (hallParam) {
      menus = menus.filter((m) =>
        m.hallName.toLowerCase().replace(/\s+/g, "-").includes(hallParam.toLowerCase()),
      );
    }

    // Filter by meal period if requested.
    // "all_day" entries (from the live adapter) are always included.
    if (mealParam) {
      menus = menus.filter(
        (m) => m.mealPeriod === mealParam || m.mealPeriod === "all_day",
      );
    }

    // Cache for 30 minutes; allow stale-while-revalidate for up to 1 hour.
    return NextResponse.json(menus, {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
        "X-Data-Source": adapter.getSourceName(),
      },
    });
  } catch (err) {
    console.error("[/api/menus]", err);
    return NextResponse.json({ error: "Failed to fetch menus" }, { status: 500 });
  }
}
