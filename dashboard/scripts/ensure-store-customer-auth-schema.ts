/**
 * Ensures storefront customer auth schema exists when migrations are out-of-sync.
 *
 * From dashboard directory:
 *   npx tsx scripts/ensure-store-customer-auth-schema.ts
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

  await sql.unsafe(`
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "password_hash" varchar(255);
`);

  await sql.unsafe(`
CREATE TABLE IF NOT EXISTS "customer_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "token" varchar(255) NOT NULL UNIQUE,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
`);

  await sql.unsafe(`
CREATE INDEX IF NOT EXISTS "customer_sessions_token_idx" ON "customer_sessions" ("token");
`);

  await sql.unsafe(`
CREATE INDEX IF NOT EXISTS "customer_sessions_customer_idx" ON "customer_sessions" ("customer_id");
`);

  await sql.unsafe(`
CREATE TABLE IF NOT EXISTS "store_newsletter_signups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
`);

  await sql.unsafe(`
CREATE UNIQUE INDEX IF NOT EXISTS "store_newsletter_signups_email_idx" ON "store_newsletter_signups" ("email");
`);

  console.log("OK: customers.password_hash + customer_sessions + store_newsletter_signups are present.");
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
