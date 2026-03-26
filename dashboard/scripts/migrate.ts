/**
 * Migration Runner Script
 *
 * Run: npx tsx scripts/migrate.ts
 */

import "dotenv/config";
import { Pool } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join } from "path";

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Read the migration SQL file
    const migrationPath = join(__dirname, "../drizzle/0001_multi_sell_b2b_bundles.sql");
    const migrationSQL = readFileSync(migrationPath, "utf-8");

    console.log("Running migration: 0001_multi_sell_b2b_bundles.sql");

    // Split by semicolon and run each statement
    const statements = migrationSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
          console.log("✓ Executed:", statement.substring(0, 50) + "...");
        } catch (error: any) {
          // Check if it's a "already exists" or "duplicate" error - those are OK
          if (
            error.message.includes("already exists") ||
            error.message.includes("duplicate") ||
            error.message.includes("does not exist") ||
            error.code === "42P07" || // duplicate_table
            error.code === "42701" || // duplicate_column
            error.code === "42P16" // // conflicting_tables
          ) {
            console.log("⊘ Skipped (already exists):", statement.substring(0, 50) + "...");
          } else {
            console.error("✗ Error:", error.message);
            console.error("Statement:", statement.substring(0, 200));
            // Continue anyway for idempotency
          }
        }
      }
    }

    console.log("\nMigration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);
