/**
 * Database Connection using Neon Serverless PostgreSQL
 *
 * This file exports a singleton database connection instance
 * for use throughout the application.
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

import * as schema from "./schema";

// Create singleton database connection
let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!db) {
    const sql = neon(process.env.DATABASE_URL!);
    db = drizzle(sql, { schema });
  }
  return db;
}

// Export schema for use in queries
export * from "./schema";
