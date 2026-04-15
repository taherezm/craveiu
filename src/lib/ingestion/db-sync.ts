/**
 * Database synchronisation for menu ingestion.
 *
 * Responsibilities:
 *   - Upsert dining halls by slug (create if missing, update name/location).
 *   - Create menu snapshots, skipping exact duplicates via sourceHash.
 *   - Deactivate superseded snapshots for the same hall + date + mealPeriod.
 *   - Insert menu items for new snapshots.
 *   - Detect added / updated / deactivated items by comparing with the
 *     previous snapshot.
 *   - Write ingestion log rows.
 *
 * All DB writes are best-effort: if DATABASE_URL is not configured the
 * functions resolve with zero-count results rather than throwing.
 */

import { eq, and, ne } from "drizzle-orm";
import { db } from "../db";
import {
  diningHalls,
  menuSnapshots,
  menuItems,
  ingestionLogs,
} from "../db/schema";
import type { ParsedMenu, ParsedMenuItem } from "./parser";
import { DINING_HALLS } from "../constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyncResult {
  hallId: string;
  snapshotId: string;
  isNewSnapshot: boolean;
  itemsAdded: number;
  itemsUpdated: number;
  itemsDeactivated: number;
}

export interface SyncSummary {
  itemsAdded: number;
  itemsUpdated: number;
  itemsDeactivated: number;
  locationsProcessed: string[];
  errors: string[];
}

// ---------------------------------------------------------------------------
// Hall upsert
// ---------------------------------------------------------------------------

/** Cache of slug → DB UUID so we don't re-query every snapshot. */
const _hallIdCache = new Map<string, string>();

/**
 * Ensure a dining hall row exists for the given name.
 * Looks up by slug (derived from name); inserts if missing.
 * Returns the hall's UUID.
 */
export async function ensureDiningHall(hallName: string): Promise<string> {
  const slug = nameToSlug(hallName);

  if (_hallIdCache.has(slug)) return _hallIdCache.get(slug)!;

  // Check DB
  const rows = await db
    .select({ id: diningHalls.id })
    .from(diningHalls)
    .where(eq(diningHalls.slug, slug))
    .limit(1);

  if (rows.length > 0) {
    _hallIdCache.set(slug, rows[0].id);
    return rows[0].id;
  }

  // Insert from our constants catalogue, falling back to minimal defaults.
  const meta = DINING_HALLS.find((h) => h.slug === slug);
  const [inserted] = await db
    .insert(diningHalls)
    .values({
      name: meta?.name ?? hallName,
      slug,
      location: meta?.location ?? "",
      description: meta?.description ?? "",
      imageUrl: meta?.imageUrl ?? null,
      hours: meta?.hours ?? null,
    })
    .returning({ id: diningHalls.id });

  _hallIdCache.set(slug, inserted.id);
  return inserted.id;
}

// ---------------------------------------------------------------------------
// Snapshot upsert + change detection
// ---------------------------------------------------------------------------

/**
 * Synchronise a single parsed menu into the database.
 *
 * Flow:
 *   1. Ensure the dining hall row exists.
 *   2. If a snapshot with this sourceHash already exists → skip (no-op).
 *   3. Deactivate any prior active snapshot for the same hall+date+mealPeriod.
 *   4. Insert the new snapshot + all its items.
 *   5. Compare new item set with the prior snapshot to count changes.
 */
export async function syncParsedMenu(menu: ParsedMenu): Promise<SyncResult> {
  const mealPeriod = normaliseMealPeriod(menu.mealPeriod);

  // 1. Ensure hall
  const hallId = await ensureDiningHall(menu.hallName);

  // 2. Duplicate check via sourceHash
  const existing = await db
    .select({ id: menuSnapshots.id })
    .from(menuSnapshots)
    .where(eq(menuSnapshots.sourceHash, menu.sourceHash))
    .limit(1);

  if (existing.length > 0) {
    return {
      hallId,
      snapshotId: existing[0].id,
      isNewSnapshot: false,
      itemsAdded: 0,
      itemsUpdated: 0,
      itemsDeactivated: 0,
    };
  }

  // 3. Find the previous active snapshot for this hall + date + mealPeriod
  const prevSnapshots = await db
    .select({
      id: menuSnapshots.id,
    })
    .from(menuSnapshots)
    .where(
      and(
        eq(menuSnapshots.hallId, hallId),
        eq(menuSnapshots.date, menu.date),
        eq(menuSnapshots.mealPeriod, mealPeriod),
        eq(menuSnapshots.isActive, true),
      ),
    );

  // Load items from the previous snapshot for change detection.
  const prevItemNames = new Set<string>();
  if (prevSnapshots.length > 0) {
    for (const prev of prevSnapshots) {
      const prevItems = await db
        .select({ normalizedName: menuItems.normalizedName })
        .from(menuItems)
        .where(eq(menuItems.snapshotId, prev.id));
      for (const row of prevItems) prevItemNames.add(row.normalizedName);
    }

    // Deactivate all prior active snapshots for this slot.
    for (const prev of prevSnapshots) {
      await db
        .update(menuSnapshots)
        .set({ isActive: false })
        .where(eq(menuSnapshots.id, prev.id));
    }
  }

  // 4. Insert new snapshot
  const [snapshot] = await db
    .insert(menuSnapshots)
    .values({
      hallId,
      date: menu.date,
      mealPeriod,
      rawPayload: { parseConfidence: menu.parseConfidence },
      sourceHash: menu.sourceHash,
      isActive: true,
    })
    .returning({ id: menuSnapshots.id });

  // 5. Insert items + count changes
  let itemsAdded = 0;
  let itemsUpdated = 0;

  const newItemNames = new Set<string>();

  for (const station of menu.stations) {
    for (const item of station.items) {
      newItemNames.add(item.normalizedName);

      await db.insert(menuItems).values({
        snapshotId: snapshot.id,
        stationName: station.name,
        itemName: item.rawName,
        normalizedName: item.normalizedName,
        category: normaliseFoodCategory(item.category),
        isVegetarian: item.isVegetarian ?? false,
        isVegan: item.isVegan ?? false,
        isGlutenFree: item.isGlutenFree ?? false,
        calories: item.calories ?? null,
        protein: item.protein ?? null,
        allergens: item.allergens ?? [],
      });

      if (prevItemNames.has(item.normalizedName)) {
        itemsUpdated++;
      } else {
        itemsAdded++;
      }
    }
  }

  // Items present in the previous snapshot but not in the new one are
  // "deactivated" (removed from today's menu).
  const itemsDeactivated = [...prevItemNames].filter(
    (name) => !newItemNames.has(name),
  ).length;

  return {
    hallId,
    snapshotId: snapshot.id,
    isNewSnapshot: true,
    itemsAdded,
    itemsUpdated,
    itemsDeactivated,
  };
}

// ---------------------------------------------------------------------------
// Ingestion log
// ---------------------------------------------------------------------------

export async function writeIngestionLog(params: {
  hallId: string;
  date: string;
  status: "success" | "partial" | "failed";
  itemCount: number;
  errorMessage?: string;
}): Promise<void> {
  await db.insert(ingestionLogs).values({
    hallId: params.hallId,
    date: params.date,
    status: params.status,
    itemCount: params.itemCount,
    errorMessage: params.errorMessage ?? null,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nameToSlug(name: string): string {
  // Try to match against our known hall slugs first (by normalised name).
  const lower = name.toLowerCase().trim();
  if (lower.includes("mcnutt"))   return "mcnutt";
  if (lower.includes("forest"))   return "forest";
  if (lower.includes("wright"))   return "wright";
  if (lower.includes("goodbody")) return "goodbody";
  if (lower.includes("collins"))  return "collins";
  // Fallback: generic slugification
  return lower.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Coerce any meal period string to the DB enum values. */
function normaliseMealPeriod(
  raw: string,
): "breakfast" | "lunch" | "dinner" | "latenight" {
  const lower = raw.toLowerCase();
  if (lower === "breakfast") return "breakfast";
  if (lower === "dinner")    return "dinner";
  if (lower === "latenight" || lower === "late night" || lower === "late_night")
    return "latenight";
  return "lunch"; // Safe default covers "lunch", "all_day", and unknowns
}

/** Map the normalisation engine's category strings to the DB food category enum. */
function normaliseFoodCategory(
  raw: string | null,
): "comfort" | "protein" | "breakfast" | "sides" | "dessert" | "healthy" | "international" | null {
  if (!raw) return null;
  const valid = ["comfort", "protein", "breakfast", "sides", "dessert", "healthy", "international"] as const;
  return (valid as readonly string[]).includes(raw)
    ? (raw as typeof valid[number])
    : null;
}
