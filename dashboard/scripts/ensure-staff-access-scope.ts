/**
 * One-off: add users.staff_access_scope if missing (when drizzle migrate did not apply).
 * Run from dashboard: npx tsx scripts/ensure-staff-access-scope.ts
 */
import "dotenv/config";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  const sql = postgres(url);
  await sql.unsafe(
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "staff_access_scope" varchar(32)`
  );
  console.log('Done: column "staff_access_scope" is present on "users".');
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
