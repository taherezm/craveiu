/**
 * POST /api/ingest
 *
 * Triggers a menu ingestion run against IU Dining's CBORD NetNutrition system
 * (or the mock adapter when ENABLE_REAL_INGESTION is not set to "true").
 *
 * Query parameters:
 *   ?date=YYYY-MM-DD   Process a specific date (default: today)
 *   ?days=N            Also process the next N-1 days (max 7, default 1)
 *
 * Authentication:
 *   If INGESTION_CRON_SECRET is set, the request must carry
 *   Authorization: Bearer <secret>
 *
 * Response: IngestionResult JSON (see scheduler.ts for the shape).
 */

import { NextRequest, NextResponse } from "next/server";
import { IUDiningAdapter } from "@/lib/ingestion/iu-dining-adapter";
import { MockAdapter } from "@/lib/ingestion/mock-adapter";
import { ingestMenusForDates } from "@/lib/ingestion/scheduler";

// ---------------------------------------------------------------------------
// Adapter selection
// ---------------------------------------------------------------------------

const useRealData = process.env.ENABLE_REAL_INGESTION === "true";
const adapter = useRealData ? new IUDiningAdapter() : new MockAdapter();

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // ── Auth guard ─────────────────────────────────────────────────────────
  const secret = process.env.INGESTION_CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // ── Parse query params ─────────────────────────────────────────────────
  const { searchParams } = req.nextUrl;

  const dateParam = searchParams.get("date");
  const daysParam = searchParams.get("days");

  let startDate: Date;
  try {
    startDate = dateParam ? parseDateParam(dateParam) : new Date();
  } catch {
    return NextResponse.json(
      { error: `Invalid date parameter: "${dateParam}"` },
      { status: 400 },
    );
  }

  const days = Math.min(Math.max(parseInt(daysParam ?? "1", 10) || 1, 1), 7);

  // Build the list of dates to ingest.
  const dates: Date[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }

  // ── Run ingestion ──────────────────────────────────────────────────────
  try {
    const result = await ingestMenusForDates(adapter, dates);
    const httpStatus = result.status === "failed" ? 500 : 200;
    return NextResponse.json(result, { status: httpStatus });
  } catch (err) {
    console.error("[/api/ingest]", err);
    return NextResponse.json(
      {
        status: "failed",
        last_updated: new Date().toISOString(),
        locations_processed: [],
        items_added: 0,
        items_updated: 0,
        items_deactivated: 0,
        errors: [{ location: "system", message: String(err) }],
      },
      { status: 500 },
    );
  }
}

// Also expose GET so health checks and manual browser triggers work.
export async function GET(req: NextRequest) {
  return POST(req);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a YYYY-MM-DD date string into a midnight-local Date.
 * Throws if the format is invalid.
 */
function parseDateParam(s: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error(`Expected YYYY-MM-DD, got "${s}"`);
  }
  const d = new Date(`${s}T00:00:00`);
  if (isNaN(d.getTime())) throw new Error(`Invalid date: "${s}"`);
  return d;
}
