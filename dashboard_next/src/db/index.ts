/**
 * Database Connection using Neon Serverless PostgreSQL
 *
 * This file exports a database connection for use throughout the application.
 *
 * Uses the WebSocket driver (neon-serverless) for transaction support.
 * In serverless environments, we create a new connection pool per request
 * to avoid connection termination issues.
 */

import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";

import * as schema from "./schema";

const globalForDb = global as unknown as {
  pool?: Pool;
  db?: ReturnType<typeof drizzle>;
};

export function getDb() {
  if (!globalForDb.pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    globalForDb.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 30000, // Increased from 5s to 30s for serverless environments
      idle_in_transaction_session_timeout: 60000, // Kill idle transactions after 60s
    });

    // Handle pool errors
    globalForDb.pool.on('error', (err: Error) => {
      console.error('Unexpected database pool error:', err);
    });
  }
  if (!globalForDb.db) {
    globalForDb.db = drizzle({ client: globalForDb.pool, schema });
  }
  return globalForDb.db;
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    if (globalForDb.pool) {
      await globalForDb.pool.end();
    }
  });
}

// Export schema for use in queries
export * from "./schema";
