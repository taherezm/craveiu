// ---------------------------------------------------------------------------
// CraveIU -- Drizzle database connection
// ---------------------------------------------------------------------------

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Raw postgres client.  We keep a module-level singleton so the connection
 * pool is reused across hot-reloads in development.
 */
const globalForDb = globalThis as unknown as {
  pgClient: ReturnType<typeof postgres> | undefined;
};

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
        "Please add it to .env.local (see README for details).",
    );
  }
  return url;
}

const client =
  globalForDb.pgClient ??
  postgres(getConnectionString(), {
    // In serverless / edge environments keep the pool small.
    max: process.env.NODE_ENV === "production" ? 10 : 3,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  // Preserve the client across HMR in development.
  globalForDb.pgClient = client;
}

/**
 * Drizzle ORM database instance -- import this wherever you need to
 * run queries.
 *
 * ```ts
 * import { db } from "@/lib/db";
 * const halls = await db.select().from(schema.diningHalls);
 * ```
 */
export const db = drizzle(client, { schema });

export type Database = typeof db;
