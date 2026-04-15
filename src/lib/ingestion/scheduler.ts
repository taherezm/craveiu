/**
 * Ingestion scheduler / orchestrator.
 *
 * Drives a full ingest run:
 *   1. Call adapter.fetchMenus() for each requested date
 *   2. Parse raw menus through the normalization parser
 *   3. Deduplicate via sourceHash
 *   4. Persist to the database (upsert halls, snapshots, items)
 *   5. Detect and count added / updated / deactivated items
 *   6. Write an ingestion log row per hall
 *   7. Return a structured summary
 *
 * DB writes are best-effort: if DATABASE_URL is not configured the run
 * succeeds in memory-only mode and DB-related counts are omitted.
 *
 * In production this is triggered by a cron job hitting POST /api/ingest.
 * You can also run ingestMenus() directly from scripts/seed files.
 */

import type { MenuIngestionAdapter } from "./adapter";
import { parseRawMenus } from "./parser";
import type { ParsedMenu } from "./parser";
import {
  syncParsedMenu,
  writeIngestionLog,
} from "./db-sync";

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface IngestionResult {
  status: "success" | "partial" | "failed";
  last_updated: string;
  locations_processed: string[];
  items_added: number;
  items_updated: number;
  items_deactivated: number;
  errors: IngestionError[];
  /** Internal diagnostics (not part of the public API contract). */
  _meta: {
    date: string;
    source: string;
    totalMenus: number;
    totalItems: number;
    skippedDuplicates: number;
    avgConfidence: number;
    durationMs: number;
    logs: IngestionLogEntry[];
  };
}

export interface IngestionError {
  location: string;
  mealPeriod?: string;
  message: string;
}

/** Per-menu log entry for internal diagnostics. */
export interface IngestionLogEntry {
  hallName: string;
  mealPeriod: string;
  status: "success" | "skipped" | "error";
  itemCount: number;
  parseConfidence: number;
  sourceHash: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export async function ingestMenus(
  adapter: MenuIngestionAdapter,
  date: Date = new Date(),
): Promise<IngestionResult> {
  return ingestMenusForDates(adapter, [date]);
}

/**
 * Run ingestion for one or more dates.
 * Results are aggregated into a single IngestionResult.
 */
export async function ingestMenusForDates(
  adapter: MenuIngestionAdapter,
  dates: Date[],
): Promise<IngestionResult> {
  const start = Date.now();
  const primaryDateStr = dates[0]?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  const logs: IngestionLogEntry[] = [];
  const errors: IngestionError[] = [];
  const processedLocations = new Set<string>();

  let totalItems = 0;
  let skippedDuplicates = 0;
  let itemsAdded = 0;
  let itemsUpdated = 0;
  let itemsDeactivated = 0;
  const confidences: number[] = [];

  // Fetch and process each date sequentially to respect rate limits.
  for (const date of dates) {
    const dateStr = date.toISOString().slice(0, 10);

    // ── Step 1: Fetch raw menus ──────────────────────────────────────────
    let rawMenus;
    try {
      rawMenus = await adapter.fetchMenus(date);
    } catch (err) {
      const msg = String(err);
      errors.push({ location: "all", mealPeriod: "all", message: msg });
      logs.push({
        hallName: "all",
        mealPeriod: "all",
        status: "error",
        itemCount: 0,
        parseConfidence: 0,
        sourceHash: "",
        error: msg,
      });
      continue;
    }

    if (rawMenus.length === 0) {
      errors.push({
        location: "all",
        message: `No menus returned for ${dateStr} (halls may be closed or source unavailable)`,
      });
      continue;
    }

    // ── Step 2: Parse ────────────────────────────────────────────────────
    let parsedMenus: ParsedMenu[];
    try {
      parsedMenus = parseRawMenus(rawMenus);
    } catch (err) {
      const msg = String(err);
      errors.push({ location: "parser", message: msg });
      continue;
    }

    // ── Step 3: Process each parsed menu ─────────────────────────────────
    for (const menu of parsedMenus) {
      const itemCount = menu.stations.reduce((s, st) => s + st.items.length, 0);
      processedLocations.add(menu.hallName);

      // Log low-confidence menus as warnings.
      if (menu.lowConfidenceCount > 0) {
        console.warn(
          `[scheduler] ${menu.hallName} ${menu.mealPeriod}: ` +
            `${menu.lowConfidenceCount} low-confidence items`,
        );
      }

      // ── Step 4: DB persistence ─────────────────────────────────────────
      let syncResult: Awaited<ReturnType<typeof syncParsedMenu>> | null = null;
      try {
        syncResult = await syncParsedMenu(menu);

        if (!syncResult.isNewSnapshot) {
          // Exact duplicate — already in DB.
          skippedDuplicates++;
          logs.push({
            hallName: menu.hallName,
            mealPeriod: menu.mealPeriod,
            status: "skipped",
            itemCount: 0,
            parseConfidence: menu.parseConfidence,
            sourceHash: menu.sourceHash,
          });
          continue;
        }

        itemsAdded      += syncResult.itemsAdded;
        itemsUpdated    += syncResult.itemsUpdated;
        itemsDeactivated += syncResult.itemsDeactivated;

        // Write ingestion log row.
        await writeIngestionLog({
          hallId: syncResult.hallId,
          date: menu.date,
          status: "success",
          itemCount,
        });
      } catch (dbErr) {
        // DB write failed — record error but don't abort the run.
        const msg = String(dbErr);
        console.warn(`[scheduler] DB sync failed for ${menu.hallName}:`, dbErr);
        errors.push({ location: menu.hallName, mealPeriod: menu.mealPeriod, message: msg });

        // Attempt to log the failure.
        try {
          if (syncResult?.hallId) {
            await writeIngestionLog({
              hallId: syncResult.hallId,
              date: menu.date,
              status: "failed",
              itemCount: 0,
              errorMessage: msg,
            });
          }
        } catch { /* swallow */ }
      }

      totalItems += itemCount;
      confidences.push(menu.parseConfidence);

      logs.push({
        hallName: menu.hallName,
        mealPeriod: menu.mealPeriod,
        status: "success",
        itemCount,
        parseConfidence: menu.parseConfidence,
        sourceHash: menu.sourceHash,
      });
    }
  }

  const avgConfidence =
    confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

  const totalMenus = logs.length;
  const failedMenus = logs.filter((l) => l.status === "error").length;

  let status: IngestionResult["status"] = "success";
  if (totalMenus === 0 && errors.length > 0) status = "failed";
  else if (errors.length > 0 || failedMenus > 0) status = "partial";

  return {
    status,
    last_updated: new Date().toISOString(),
    locations_processed: [...processedLocations],
    items_added: itemsAdded,
    items_updated: itemsUpdated,
    items_deactivated: itemsDeactivated,
    errors,
    _meta: {
      date: primaryDateStr,
      source: adapter.getSourceName(),
      totalMenus,
      totalItems,
      skippedDuplicates,
      avgConfidence: Math.round(avgConfidence * 1000) / 1000,
      durationMs: Date.now() - start,
      logs,
    },
  };
}
