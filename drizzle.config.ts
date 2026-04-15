// ---------------------------------------------------------------------------
// CraveIU -- Drizzle Kit configuration
// ---------------------------------------------------------------------------

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",

  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },

  // Use Supabase-style migration prefixes (timestamp-based).
  migrations: {
    prefix: "supabase",
  },

  // Supabase roles support.
  entities: {
    roles: {
      provider: "supabase",
    },
  },

  verbose: true,
  strict: true,
});
