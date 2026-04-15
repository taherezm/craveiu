import { NextResponse } from "next/server";
import { MockAdapter } from "@/lib/ingestion/mock-adapter";
import { IUDiningAdapter } from "@/lib/ingestion/iu-dining-adapter";
import { DINING_HALLS } from "@/lib/constants";

const useRealData = process.env.ENABLE_REAL_INGESTION === "true";
const mockAdapter = new MockAdapter();
const realAdapter = new IUDiningAdapter();
const adapter = useRealData ? realAdapter : mockAdapter;

export async function GET() {
  try {
    const [healthy, menus] = await Promise.all([
      adapter.healthCheck(),
      adapter.fetchMenus(new Date()),
    ]);

    // Build per-hall stats from today's data
    const hallMap = new Map<string, { itemCount: number }>();
    for (const menu of menus) {
      const existing = hallMap.get(menu.hallName) ?? { itemCount: 0 };
      existing.itemCount += menu.stations.reduce((s, st) => s + st.items.length, 0);
      hallMap.set(menu.hallName, existing);
    }

    const now = new Date().toISOString();
    const hallStatus = DINING_HALLS.map((h) => {
      const stats = hallMap.get(h.name) ?? { itemCount: 0 };
      const isOpen = stats.itemCount > 0;
      return {
        hallName: h.name,
        itemCount: stats.itemCount,
        lastSync: now,
        isOpen,
        // Confidence is 1.0 for live data, 0.88 for mock
        confidence: isOpen ? (useRealData ? 1.0 : 0.88) : 0,
      };
    });

    const totalItems = hallStatus.reduce((s, h) => s + h.itemCount, 0);
    const openHalls = hallStatus.filter((h) => h.isOpen);
    const avgConfidence =
      openHalls.length > 0
        ? openHalls.reduce((s, h) => s + h.confidence, 0) / openHalls.length
        : 0;

    const recentLogs = DINING_HALLS.map((h, i) => {
      const stats = hallMap.get(h.name);
      return {
        id: `log-${i + 1}`,
        hallName: h.name,
        status: stats && stats.itemCount > 0 ? "success" : "closed",
        itemCount: stats?.itemCount ?? 0,
        createdAt: new Date(Date.now() - i * 2000).toISOString(),
      };
    });

    return NextResponse.json({
      lastSync: now,
      sourceHealth: healthy,
      sourceName: adapter.getSourceName(),
      isLiveData: useRealData,
      hallStatus,
      recentLogs,
      avgConfidence,
      totalItems,
    });
  } catch (err) {
    console.error("[/api/admin]", err);
    return NextResponse.json({ error: "Failed to load admin status" }, { status: 500 });
  }
}
