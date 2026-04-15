/**
 * IU Dining Adapter — live data from IU Bloomington dining halls.
 *
 * Fetches real menu data from the CBORD NetNutrition system used by
 * Indiana University at https://nutrition.dining.indiana.edu/NetNutrition/46
 *
 * Protocol notes (reverse-engineered):
 *   - All state is server-side session. The cookie must be carried on every request.
 *   - Navigation is sequential and stateful:
 *       1. GET  /NetNutrition/46                              → captures session cookies
 *       2. POST Unit/SelectUnitFromSideBar                   → navigate to a dining hall
 *       3. POST Unit/SelectUnitFromChildUnitsList            → navigate to a station
 *       4. POST Menu/SelectMenu                              → fetch items for a menu OID
 *       5. POST NutritionDetail/GetNutritionLabel (optional) → fetch per-item nutrition
 *   - All POST responses return JSON: { success: bool, panels: [{id, html}] }
 *   - Items live in <span class="cbo_nn_itemHover"> inside the "itemPanel" div.
 *   - Dietary icons follow each item as <img alt="Vegetarian"> etc.
 *   - Nutrition label HTML contains calories, macros, and allergen text.
 *
 * Hall unit OIDs (confirmed live):
 *   McNutt Dining Hall   = 1   (stations 2–11)
 *   Forest Dining Hall   = 12  (stations 13–22)
 *   Wright Dining Hall   = 23  (stations 24–33)
 *   Goodbody Hall Eatery = 39  (stations 40–43)
 *   Collins Eatery       = 44  (stations 45–47)
 */

import type {
  MenuIngestionAdapter,
  RawMenuData,
  RawMenuItemData,
  RawStationData,
} from "./adapter";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CBORD_BASE = "https://nutrition.dining.indiana.edu/NetNutrition/46";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 CraveIU/1.0";

const CACHE_TTL_MS =
  parseInt(process.env.MENU_CACHE_TTL_MINUTES ?? "30") * 60 * 1000;

/** Delay between consecutive CBORD requests (ms). Respect rate limits. */
const RATE_LIMIT_MS = 200;

/** Maximum retries per failed CBORD request. */
const MAX_RETRIES = 3;

/** Abort a full fetch run if it takes longer than this. */
const FETCH_TIMEOUT_MS = 120_000;

/**
 * Whether to fetch per-item nutrition labels.
 * Disabled by default: adds ~N×150ms latency per station per hall.
 * Enable via FETCH_NUTRITION_DETAILS=true in env.
 */
const FETCH_NUTRITION =
  process.env.FETCH_NUTRITION_DETAILS === "true";

// ---------------------------------------------------------------------------
// Hall/station configuration
// ---------------------------------------------------------------------------

interface HallConfig {
  slug: string;
  name: string;
  unitOid: number;
}

const HALLS: HallConfig[] = [
  { slug: "mcnutt",   name: "McNutt Dining Hall",   unitOid: 1  },
  { slug: "forest",   name: "Forest Dining Hall",   unitOid: 12 },
  { slug: "wright",   name: "Wright Dining Hall",   unitOid: 23 },
  { slug: "goodbody", name: "Goodbody Hall Eatery", unitOid: 39 },
  { slug: "collins",  name: "Collins Eatery",       unitOid: 44 },
];

// ---------------------------------------------------------------------------
// Meal period mapping
// ---------------------------------------------------------------------------

export type MealPeriodKey = "breakfast" | "lunch" | "dinner" | "latenight";

/**
 * Map a CBORD menu name (e.g. "Breakfast", "Lunch", "Late Night Dining")
 * to one of the four canonical meal period keys the DB recognises.
 */
function parseMealPeriod(menuName: string): MealPeriodKey {
  const lower = menuName.toLowerCase().trim();
  if (lower.includes("breakfast") || lower.includes("morning") || lower.includes("brunch")) {
    return "breakfast";
  }
  if (lower.includes("late") || lower.includes("night") || lower.includes("midnight")) {
    return "latenight";
  }
  if (lower.includes("dinner") || lower.includes("supper") || lower.includes("evening")) {
    return "dinner";
  }
  // Default: lunch covers midday, "all day", and anything unrecognised.
  return "lunch";
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

interface Session {
  cookie: string;
  createdAt: number;
}

let _session: Session | null = null;
/** ASP.NET sessions typically expire after 20 minutes of inactivity. */
const SESSION_TTL_MS = 18 * 60 * 1000;

/**
 * Returns a cookie string by GETting the CBORD landing page, which issues
 * both ASP.NET_SessionId and CBORD.netnutrition2 cookies on the initial request.
 */
async function acquireSession(): Promise<string> {
  if (_session && Date.now() - _session.createdAt < SESSION_TTL_MS) {
    return _session.cookie;
  }

  const res = await fetchWithRetry(CBORD_BASE, {
    redirect: "manual",
    headers: { "User-Agent": USER_AGENT },
  });

  const parts: string[] = [];
  const hdrs = res.headers as Headers & { getSetCookie?: () => string[] };

  if (typeof hdrs.getSetCookie === "function") {
    for (const raw of hdrs.getSetCookie()) {
      const kv = raw.split(";")[0].trim();
      if (kv) parts.push(kv);
    }
  } else {
    const raw = res.headers.get("set-cookie") ?? "";
    const cookieSplitRe = /,(?=\s*[A-Za-z0-9_.]+=)/;
    for (const segment of raw.split(cookieSplitRe)) {
      const kv = segment.split(";")[0].trim();
      if (kv) parts.push(kv);
    }
  }

  const cookie = parts.join("; ");
  _session = { cookie, createdAt: Date.now() };
  return cookie;
}

function clearSession(): void {
  _session = null;
}

// ---------------------------------------------------------------------------
// Retry-aware fetch helpers
// ---------------------------------------------------------------------------

/**
 * Fetch with exponential backoff retry.
 * Retries on network errors and 5xx responses.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(15_000),
      });
      // Retry on server errors, but not on 4xx (client errors).
      if (res.status >= 500 && attempt < retries) {
        await sleep(backoffMs(attempt));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await sleep(backoffMs(attempt));
      }
    }
  }
  throw lastErr ?? new Error(`Failed after ${retries} retries: ${url}`);
}

function backoffMs(attempt: number): number {
  // 300ms, 900ms, 2700ms — capped at 5s
  return Math.min(300 * Math.pow(3, attempt), 5_000);
}

// ---------------------------------------------------------------------------
// CBORD API helpers
// ---------------------------------------------------------------------------

type CbordPanel = { id: string; html: string };
type CbordResponse = { success: boolean; panels?: CbordPanel[] };

async function cbordPost(
  endpoint: string,
  cookie: string,
  bodyFields: Record<string, string | number>,
): Promise<CbordResponse> {
  const body = new URLSearchParams(
    Object.entries(bodyFields).map(([k, v]) => [k, String(v)]),
  ).toString();

  const res = await fetchWithRetry(`${CBORD_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": USER_AGENT,
      Cookie: cookie,
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`CBORD ${endpoint} → HTTP ${res.status}`);
  }

  return res.json() as Promise<CbordResponse>;
}

function panelHtml(data: CbordResponse, id: string): string {
  return data.panels?.find((p) => p.id === id)?.html ?? "";
}

// ---------------------------------------------------------------------------
// HTML parsers (regex-based — no DOM dependency in Node)
// ---------------------------------------------------------------------------

interface StationRef {
  unitOid: number;
  name: string;
}

/** Extract station links from the childUnitsPanel HTML. */
function parseStations(html: string): StationRef[] {
  const matches = [
    ...html.matchAll(/childUnitsSelectUnit\((\d+)\)[^>]*>([^<]+)</g),
  ];
  return matches.map((m) => ({
    unitOid: parseInt(m[1], 10),
    name: m[2].trim(),
  }));
}

/**
 * Format a JS Date as "Monday, April 13, 2026" — matching the CBORD date
 * headers exactly.
 */
function cbordDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Indiana/Indianapolis",
  });
}

interface MenuRef {
  menuOid: number;
  mealPeriod: MealPeriodKey;
  menuName: string;
}

/**
 * Extract ALL meal-period menu references for a specific date from
 * the menuPanel HTML.
 *
 * CBORD groups menus by date under a <header class="card-title h4"> element.
 * Each menu within the date block is a link with onclick="menuListSelectMenu(OID)".
 * The link text is the meal name (e.g. "Breakfast", "Lunch", "Dinner").
 */
function parseAllMenuRefs(html: string, targetDate: Date): MenuRef[] {
  const targetLabel = cbordDateLabel(targetDate);
  const results: MenuRef[] = [];

  // Split HTML into date card blocks by finding card-title headers.
  // Each block: everything between one card-title and the next (or end of string).
  const cardRe = /card-title[^>]+>([^<]+)<\/header>([\s\S]*?)(?=card-title|$)/g;
  let card: RegExpExecArray | null;

  while ((card = cardRe.exec(html)) !== null) {
    if (card[1].trim() !== targetLabel) continue;

    const blockHtml = card[2];
    // Within the date block, extract each "menuListSelectMenu(OID)">MealName</a>
    const menuRe = /menuListSelectMenu\((\d+)\)[^>]*>([^<]+)/g;
    let m: RegExpExecArray | null;

    while ((m = menuRe.exec(blockHtml)) !== null) {
      const menuOid = parseInt(m[1], 10);
      const menuName = m[2].trim();
      if (!menuName || isNaN(menuOid)) continue;
      results.push({
        menuOid,
        menuName,
        mealPeriod: parseMealPeriod(menuName),
      });
    }
    break; // Found the right date block — no need to continue.
  }

  return results;
}

// ---------------------------------------------------------------------------
// Item parsing: names + OIDs + dietary tags
// ---------------------------------------------------------------------------

/**
 * CBORD item row pattern (as seen in itemPanel HTML):
 *
 *   <span class="cbo_nn_itemHover ..."
 *         onclick="javascript: showNutritionLabel(12345, 'itemPanelLabel');">
 *     Item Name
 *   </span>
 *   <img ... alt="Vegetarian" ...>
 *   <img ... alt="Vegan" ...>
 *
 * We extract item name, OID, and dietary icon alt-text in one pass by scanning
 * from each itemHover span through the next one.
 */
interface ParsedItemHtml {
  name: string;
  itemOid: number | null;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isHalal: boolean;
}

function parseItemsFromHtml(html: string): ParsedItemHtml[] {
  const results: ParsedItemHtml[] = [];

  // One regex to find each item span with its optional OID
  const itemRe =
    /class="cbo_nn_itemHover[^"]*"(?:[^>]*onclick="[^"]*showNutritionLabel\((\d+)[^"]*\)"[^>]*|[^>]*)>([^<]+)<\/(?:span|a)>([\s\S]{0,400}?)(?=class="cbo_nn_itemHover|$)/g;

  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(html)) !== null) {
    const itemOid = m[1] ? parseInt(m[1], 10) : null;
    const name = m[2].trim();
    const trailingHtml = m[3]; // HTML between this item and the next

    if (!name) continue;

    // Parse dietary icons from the trailing HTML
    const iconAlts = [...trailingHtml.matchAll(/alt="([^"]+)"/g)].map(
      (a) => a[1].toLowerCase(),
    );

    results.push({
      name,
      itemOid: itemOid && !isNaN(itemOid) ? itemOid : null,
      isVegetarian: iconAlts.some(
        (a) => a.includes("vegetarian") || a.includes("vegan"),
      ),
      isVegan: iconAlts.some((a) => a.includes("vegan")),
      isGlutenFree: iconAlts.some(
        (a) => a.includes("gluten") || a.includes("wheat free"),
      ),
      isHalal: iconAlts.some((a) => a.includes("halal")),
    });
  }

  // Fallback: if the detailed regex matched nothing, use the simple pattern
  // (handles CBORD versions that omit onclick)
  if (results.length === 0) {
    const fallbackRe = /cbo_nn_itemHover[^>]*>([^<]+)</g;
    let fm: RegExpExecArray | null;
    while ((fm = fallbackRe.exec(html)) !== null) {
      const name = fm[1].trim();
      if (name) {
        results.push({
          name,
          itemOid: null,
          isVegetarian: false,
          isVegan: false,
          isGlutenFree: false,
          isHalal: false,
        });
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Optional: per-item nutrition label fetching
// ---------------------------------------------------------------------------

interface NutritionLabel {
  calories: number | undefined;
  protein: number | undefined;
  carbs: number | undefined;
  fat: number | undefined;
  sodium: number | undefined;
  fiber: number | undefined;
  allergens: string[];
}

const _nutritionCache = new Map<number, NutritionLabel>();

/**
 * Fetch and parse the CBORD nutrition label for a single item OID.
 * Results are cached in-process so each OID is only fetched once per run.
 */
async function fetchNutritionLabel(
  itemOid: number,
  cookie: string,
): Promise<NutritionLabel> {
  const cached = _nutritionCache.get(itemOid);
  if (cached) return cached;

  let labelHtml = "";
  try {
    const data = await cbordPost(
      "NutritionDetail/GetNutritionLabel",
      cookie,
      { itemOid, detailOid: 0 },
    );
    // The nutrition label is returned in a panel; the id varies by CBORD version.
    labelHtml =
      panelHtml(data, "itemNutritionLabel") ||
      panelHtml(data, "nutritionLabel") ||
      (data.panels?.[0]?.html ?? "");
  } catch {
    // Non-fatal: return empty nutrition if the endpoint fails
    const empty: NutritionLabel = {
      calories: undefined, protein: undefined, carbs: undefined,
      fat: undefined, sodium: undefined, fiber: undefined, allergens: [],
    };
    return empty;
  }

  const label = parseNutritionHtml(labelHtml);
  _nutritionCache.set(itemOid, label);
  return label;
}

/**
 * Parse CBORD nutrition label HTML into structured values.
 *
 * The label follows the standard US Nutrition Facts panel format:
 *   <span class="cbo_nn_LabelHeader">Calories</span> <span>320</span>
 *   <span class="cbo_nn_LabelTotal">Total Fat</span> <span>12g</span>
 *   ...
 *   Contains: Milk, Wheat, Soy  (allergen text)
 */
function parseNutritionHtml(html: string): NutritionLabel {
  function extract(labelPattern: RegExp): number | undefined {
    const m = labelPattern.exec(html);
    if (!m) return undefined;
    const val = parseFloat(m[1].replace(/[^0-9.]/g, ""));
    return isNaN(val) ? undefined : val;
  }

  // Calories — rendered differently from macros in CBORD labels
  const calories = extract(/Calories[^0-9]*(\d+)/i);
  const fat      = extract(/Total\s+Fat[^0-9]*(\d+(?:\.\d+)?)/i);
  const carbs    = extract(/Total\s+Carb[^0-9]*(\d+(?:\.\d+)?)/i);
  const protein  = extract(/Protein[^0-9]*(\d+(?:\.\d+)?)/i);
  const sodium   = extract(/Sodium[^0-9]*(\d+(?:\.\d+)?)/i);
  const fiber    = extract(/Dietary\s+Fiber[^0-9]*(\d+(?:\.\d+)?)/i);

  // Allergens: "Contains: Milk, Wheat, Eggs" or icon alt text
  const allergens: string[] = [];
  const containsMatch = /contains[:\s]+([^<.]+)/i.exec(html);
  if (containsMatch) {
    const raw = containsMatch[1];
    for (const a of raw.split(/[,;]/)) {
      const trimmed = a.trim().toLowerCase();
      if (trimmed && trimmed.length < 40) allergens.push(trimmed);
    }
  }
  // Also capture allergen icons
  const iconRe = /class="cbo_nn_AllergenLogo[^"]*"\s+(?:alt|title)="([^"]+)"/gi;
  let iconMatch: RegExpExecArray | null;
  while ((iconMatch = iconRe.exec(html)) !== null) {
    const name = iconMatch[1].toLowerCase().trim();
    if (name && !allergens.includes(name)) allergens.push(name);
  }

  return { calories, protein, carbs, fat, sodium, fiber, allergens };
}

// ---------------------------------------------------------------------------
// Core fetch logic
// ---------------------------------------------------------------------------

/**
 * Fetch all meal periods for a single hall on a specific date.
 * Returns one RawMenuData per meal period that has items.
 */
async function fetchHallForDate(
  hall: HallConfig,
  date: Date,
  cookie: string,
): Promise<RawMenuData[]> {
  const dateStr = date.toISOString().slice(0, 10);

  // 1 — Navigate to the hall to populate the child-units (station) list.
  const hallData = await cbordPost("Unit/SelectUnitFromSideBar", cookie, {
    unitOid: hall.unitOid,
  });
  await sleep(RATE_LIMIT_MS);

  const childHtml = panelHtml(hallData, "childUnitsPanel");
  if (!childHtml) return [];

  const stations = parseStations(childHtml);
  if (stations.length === 0) return [];

  // Collect items grouped by meal period across all stations.
  // Map: mealPeriod → Map<stationName, items[]>
  const mealStations = new Map<MealPeriodKey, Map<string, RawMenuItemData[]>>();

  for (const station of stations) {
    // 2 — Navigate to this station to load its menu list.
    let stationData: CbordResponse;
    try {
      stationData = await cbordPost(
        "Unit/SelectUnitFromChildUnitsList",
        cookie,
        { unitOid: station.unitOid },
      );
    } catch (err) {
      console.warn(`[IUDiningAdapter] Station ${station.name} navigation failed:`, err);
      continue;
    }
    await sleep(RATE_LIMIT_MS);

    const menuHtml = panelHtml(stationData, "menuPanel");
    if (!menuHtml) continue;

    // 3 — Extract ALL meal periods for today from this station's menu list.
    const menuRefs = parseAllMenuRefs(menuHtml, date);
    if (menuRefs.length === 0) continue;

    for (const menuRef of menuRefs) {
      // 4 — Fetch the day's menu items for this meal period.
      let menuData: CbordResponse;
      try {
        menuData = await cbordPost("Menu/SelectMenu", cookie, {
          menuOid: menuRef.menuOid,
        });
      } catch (err) {
        console.warn(
          `[IUDiningAdapter] Menu fetch failed for ${hall.name} ` +
            `${menuRef.menuName} (OID ${menuRef.menuOid}):`,
          err,
        );
        continue;
      }
      await sleep(RATE_LIMIT_MS);

      const itemHtml = panelHtml(menuData, "itemPanel");
      if (!itemHtml) continue;

      const parsedItems = parseItemsFromHtml(itemHtml);
      if (parsedItems.length === 0) continue;

      // Optionally enrich items with nutrition details.
      const rawItems: RawMenuItemData[] = [];
      for (const parsed of parsedItems) {
        let nutrition: NutritionLabel = {
          calories: undefined, protein: undefined, carbs: undefined,
          fat: undefined, sodium: undefined, fiber: undefined, allergens: [],
        };

        if (FETCH_NUTRITION && parsed.itemOid !== null) {
          try {
            nutrition = await fetchNutritionLabel(parsed.itemOid, cookie);
            await sleep(RATE_LIMIT_MS);
          } catch {
            // Non-fatal — continue without nutrition data
          }
        }

        rawItems.push({
          name: parsed.name,
          isVegetarian: parsed.isVegetarian || nutrition.allergens.length === 0
            ? parsed.isVegetarian
            : parsed.isVegetarian,
          isVegan: parsed.isVegan,
          isGlutenFree: parsed.isGlutenFree,
          calories: nutrition.calories,
          protein: nutrition.protein,
          carbs: nutrition.carbs,
          fat: nutrition.fat,
          sodium: nutrition.sodium,
          fiber: nutrition.fiber,
          allergens: nutrition.allergens.length > 0
            ? nutrition.allergens
            : undefined,
        });
      }

      // Accumulate into meal period → station map.
      if (!mealStations.has(menuRef.mealPeriod)) {
        mealStations.set(menuRef.mealPeriod, new Map());
      }
      const stationMap = mealStations.get(menuRef.mealPeriod)!;
      const existing = stationMap.get(station.name) ?? [];
      // Deduplicate items within the same station by name.
      const seen = new Set(existing.map((i) => i.name.toLowerCase()));
      for (const item of rawItems) {
        if (!seen.has(item.name.toLowerCase())) {
          existing.push(item);
          seen.add(item.name.toLowerCase());
        }
      }
      stationMap.set(station.name, existing);
    }
  }

  // Convert the nested map into RawMenuData[] — one entry per meal period.
  const results: RawMenuData[] = [];
  for (const [mealPeriod, stationMap] of mealStations) {
    const rawStations: RawStationData[] = [];
    for (const [stationName, items] of stationMap) {
      if (items.length > 0) rawStations.push({ name: stationName, items });
    }
    if (rawStations.length === 0) continue;

    results.push({
      hallName: hall.name,
      date: dateStr,
      mealPeriod,
      stations: rawStations,
      rawPayload: {
        source: "CBORD NetNutrition",
        hall: hall.slug,
        date: dateStr,
        mealPeriod,
        fetchedAt: new Date().toISOString(),
      },
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Simple in-memory response cache
// ---------------------------------------------------------------------------

interface CacheEntry {
  data: RawMenuData[];
  fetchedAt: number;
}

const _cache = new Map<string, CacheEntry>();

// ---------------------------------------------------------------------------
// Adapter implementation
// ---------------------------------------------------------------------------

export class IUDiningAdapter implements MenuIngestionAdapter {
  getSourceName(): string {
    return "IU Dining (CBORD NetNutrition)";
  }

  async healthCheck(): Promise<boolean> {
    try {
      const cookie = await acquireSession();
      return cookie.includes("ASP.NET_SessionId") || cookie.includes("CBORD");
    } catch {
      return false;
    }
  }

  /**
   * Fetch menus for all dining halls on the given date.
   * Returns one RawMenuData per (hall, meal period) combination that has items.
   */
  async fetchMenus(date: Date): Promise<RawMenuData[]> {
    const dateStr = date.toISOString().slice(0, 10);
    const cacheKey = `cbord:${dateStr}`;

    const cached = _cache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.data;
    }

    const results: RawMenuData[] = [];
    const abortAt = Date.now() + FETCH_TIMEOUT_MS;

    try {
      let cookie = await acquireSession();

      for (const hall of HALLS) {
        if (Date.now() > abortAt) {
          console.warn("[IUDiningAdapter] Fetch timeout reached — aborting remaining halls.");
          break;
        }

        try {
          const hallMenus = await fetchHallForDate(hall, date, cookie);
          results.push(...hallMenus);
        } catch (err) {
          console.warn(`[IUDiningAdapter] Failed to fetch ${hall.name}:`, err);
          // Session may have expired — force a fresh one for the next hall.
          clearSession();
          try {
            cookie = await acquireSession();
          } catch {
            console.error("[IUDiningAdapter] Could not refresh session — aborting.");
            break;
          }
        }
      }
    } catch (err) {
      console.error("[IUDiningAdapter] fetchMenus failed:", err);
    }

    _cache.set(cacheKey, { data: results, fetchedAt: Date.now() });
    return results;
  }

  /**
   * Fetch menus for multiple consecutive dates starting from `startDate`.
   * Halls are fetched sequentially; dates are processed in order.
   */
  async fetchMenusForDateRange(
    startDate: Date,
    days = 1,
  ): Promise<RawMenuData[]> {
    const all: RawMenuData[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const menus = await this.fetchMenus(d);
      all.push(...menus);
    }
    return all;
  }
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
