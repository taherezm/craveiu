// ---------------------------------------------------------------------------
// CraveIU -- Drizzle ORM schema (PostgreSQL)
// ---------------------------------------------------------------------------

import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ---- Enums ----------------------------------------------------------------

export const mealPeriodEnum = pgEnum("meal_period", [
  "breakfast",
  "lunch",
  "dinner",
  "latenight",
]);

export const preferenceWeightEnum = pgEnum("preference_weight", [
  "must_have",
  "nice_to_have",
  "avoid",
]);

export const ingestionStatusEnum = pgEnum("ingestion_status", [
  "success",
  "partial",
  "failed",
]);

export const foodCategoryEnum = pgEnum("food_category", [
  "comfort",
  "protein",
  "breakfast",
  "sides",
  "dessert",
  "healthy",
  "international",
]);

// ---- Dining halls ---------------------------------------------------------

export const diningHalls = pgTable(
  "dining_halls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 128 }).notNull(),
    slug: varchar("slug", { length: 64 }).notNull(),
    location: text("location").notNull(),
    description: text("description").notNull().default(""),
    imageUrl: text("image_url"),
    hours: jsonb("hours"), // Record<MealPeriod, {open, close}>
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("dining_halls_slug_idx").on(table.slug),
  ],
);

// ---- Menu snapshots -------------------------------------------------------

export const menuSnapshots = pgTable(
  "menu_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hallId: uuid("hall_id")
      .notNull()
      .references(() => diningHalls.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    mealPeriod: mealPeriodEnum("meal_period").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    rawPayload: jsonb("raw_payload"),
    sourceHash: varchar("source_hash", { length: 64 }).notNull(),
    /**
     * false once a newer snapshot supersedes this one for the same
     * hall + date + meal period.  Items in inactive snapshots are
     * considered "removed from the menu".
     */
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [
    index("snapshots_hall_date_idx").on(
      table.hallId,
      table.date,
      table.mealPeriod,
    ),
    uniqueIndex("snapshots_hash_idx").on(table.sourceHash),
  ],
);

// ---- Menu items -----------------------------------------------------------

export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    snapshotId: uuid("snapshot_id")
      .notNull()
      .references(() => menuSnapshots.id, { onDelete: "cascade" }),
    stationName: varchar("station_name", { length: 128 }).notNull(),
    itemName: varchar("item_name", { length: 256 }).notNull(),
    normalizedName: varchar("normalized_name", { length: 256 }).notNull(),
    category: foodCategoryEnum("category"),
    isVegetarian: boolean("is_vegetarian").notNull().default(false),
    isVegan: boolean("is_vegan").notNull().default(false),
    isGlutenFree: boolean("is_gluten_free").notNull().default(false),
    isHalal: boolean("is_halal").notNull().default(false),
    calories: integer("calories"),
    protein: real("protein"),
    carbs: real("carbs"),
    fat: real("fat"),
    sodium: real("sodium"),
    fiber: real("fiber"),
    allergens: jsonb("allergens").$type<string[]>().notNull().default([]),
  },
  (table) => [
    index("items_snapshot_idx").on(table.snapshotId),
    index("items_normalized_name_idx").on(table.normalizedName),
  ],
);

// ---- Normalized foods (lookup / reference) --------------------------------

export const normalizedFoods = pgTable(
  "normalized_foods",
  {
    canonicalName: varchar("canonical_name", { length: 256 })
      .primaryKey(),
    category: foodCategoryEnum("category").notNull(),
    keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
    synonyms: jsonb("synonyms").$type<string[]>().notNull().default([]),
  },
  (table) => [
    index("normalized_foods_category_idx").on(table.category),
  ],
);

// ---- Users (extends Supabase auth.users) ----------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // matches auth.users.id
  email: varchar("email", { length: 320 }),
  displayName: varchar("display_name", { length: 128 }),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---- User preferences -----------------------------------------------------

export const userPreferences = pgTable(
  "user_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    foodName: varchar("food_name", { length: 256 }).notNull(),
    weight: preferenceWeightEnum("weight").notNull(),
    category: foodCategoryEnum("category"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("prefs_user_idx").on(table.userId),
    uniqueIndex("prefs_user_food_idx").on(table.userId, table.foodName),
  ],
);

// ---- User alerts ----------------------------------------------------------

export const userAlerts = pgTable(
  "user_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    foodName: varchar("food_name", { length: 256 }).notNull(),
    hallId: uuid("hall_id").references(() => diningHalls.id, {
      onDelete: "set null",
    }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("alerts_user_idx").on(table.userId),
    index("alerts_active_idx").on(table.userId, table.active),
  ],
);

// ---- Ingestion logs -------------------------------------------------------

export const ingestionLogs = pgTable(
  "ingestion_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hallId: uuid("hall_id")
      .notNull()
      .references(() => diningHalls.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    status: ingestionStatusEnum("status").notNull(),
    itemCount: integer("item_count").notNull().default(0),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ingestion_hall_date_idx").on(table.hallId, table.date),
  ],
);

// ---- Relations ------------------------------------------------------------

export const diningHallRelations = relations(diningHalls, ({ many }) => ({
  snapshots: many(menuSnapshots),
  alerts: many(userAlerts),
  ingestionLogs: many(ingestionLogs),
}));

export const menuSnapshotRelations = relations(
  menuSnapshots,
  ({ one, many }) => ({
    hall: one(diningHalls, {
      fields: [menuSnapshots.hallId],
      references: [diningHalls.id],
    }),
    items: many(menuItems),
  }),
);

export const menuItemRelations = relations(menuItems, ({ one }) => ({
  snapshot: one(menuSnapshots, {
    fields: [menuItems.snapshotId],
    references: [menuSnapshots.id],
  }),
}));

export const userRelations = relations(users, ({ many }) => ({
  preferences: many(userPreferences),
  alerts: many(userAlerts),
}));

export const userPreferenceRelations = relations(
  userPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [userPreferences.userId],
      references: [users.id],
    }),
  }),
);

export const userAlertRelations = relations(userAlerts, ({ one }) => ({
  user: one(users, {
    fields: [userAlerts.userId],
    references: [users.id],
  }),
  hall: one(diningHalls, {
    fields: [userAlerts.hallId],
    references: [diningHalls.id],
  }),
}));

export const ingestionLogRelations = relations(
  ingestionLogs,
  ({ one }) => ({
    hall: one(diningHalls, {
      fields: [ingestionLogs.hallId],
      references: [diningHalls.id],
    }),
  }),
);
