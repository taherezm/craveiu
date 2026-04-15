/**
 * Menu ingestion adapter interface.
 *
 * All data sources (mock, IU dining scraper, future APIs) implement this
 * contract so the ingestion scheduler can swap sources without changes.
 */

// ---------------------------------------------------------------------------
// Raw data shape returned by every adapter
// ---------------------------------------------------------------------------

export interface RawMenuItemData {
  name: string;
  description?: string;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isHalal?: boolean;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sodium?: number;
  fiber?: number;
  allergens?: string[];
}

export interface RawStationData {
  name: string;
  items: RawMenuItemData[];
}

export interface RawMenuData {
  hallName: string;
  /** ISO date string (YYYY-MM-DD). */
  date: string;
  mealPeriod: string;
  stations: RawStationData[];
  /** Original response payload for debugging / auditing. */
  rawPayload?: unknown;
}

// ---------------------------------------------------------------------------
// Adapter interface
// ---------------------------------------------------------------------------

export interface MenuIngestionAdapter {
  /**
   * Fetch menus for every dining hall for the given date.
   * Returns one RawMenuData per hall + meal-period combination.
   */
  fetchMenus(date: Date): Promise<RawMenuData[]>;

  /** Human-readable name of the data source (e.g. "IU Dining API"). */
  getSourceName(): string;

  /** Quick connectivity / availability check. */
  healthCheck(): Promise<boolean>;
}
