/**
 * Database seed script.
 *
 * Seeds dining halls and today's menu data using the mock adapter.
 * Run with:   npx tsx src/lib/db/seed.ts
 *
 * In production replace MockAdapter with IUDiningAdapter and ensure
 * DATABASE_URL is set in your environment.
 */

import { MockAdapter } from "../ingestion/mock-adapter";
import { ingestMenus } from "../ingestion/scheduler";
import { DINING_HALLS } from "../constants";

async function seed() {
  console.log("🌱 CraveIU Seed Script\n");
  console.log("Dining halls configured:");
  for (const hall of DINING_HALLS) {
    console.log(`  • ${hall.name} (${hall.slug})`);
  }
  console.log();

  const adapter = new MockAdapter();

  console.log(`📡 Source: ${adapter.getSourceName()}`);
  const healthy = await adapter.healthCheck();
  console.log(`   Health check: ${healthy ? "✅ OK" : "❌ Failed"}\n`);

  console.log("🍴 Ingesting today's menus…");
  const result = await ingestMenus(adapter);

  const meta = result._meta;

  console.log(`\n✅ Ingestion complete`);
  console.log(`   Date:        ${meta.date}`);
  console.log(`   Total menus: ${meta.totalMenus}`);
  console.log(`   Total items: ${meta.totalItems}`);
  console.log(`   Avg confidence: ${(meta.avgConfidence * 100).toFixed(1)}%`);
  console.log(`   Duration:    ${meta.durationMs}ms\n`);

  console.log("📋 Per-hall summary:");
  const hallGroups = new Map<string, typeof meta.logs>();
  for (const log of meta.logs) {
    if (!hallGroups.has(log.hallName)) hallGroups.set(log.hallName, []);
    hallGroups.get(log.hallName)!.push(log);
  }

  for (const [hallName, logs] of hallGroups) {
    const total = logs.reduce((s: number, l: (typeof logs)[number]) => s + l.itemCount, 0);
    const avgConf = logs.reduce((s: number, l: (typeof logs)[number]) => s + l.parseConfidence, 0) / logs.length;
    console.log(
      `  ${hallName}: ${total} items across ${logs.length} meal periods (${(avgConf * 100).toFixed(0)}% confidence)`,
    );
  }

  console.log("\n🎉 Done! Start the app with: npm run dev");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
