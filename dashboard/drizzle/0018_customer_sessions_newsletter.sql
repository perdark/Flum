-- Storefront: customer password, sessions, newsletter (match src/db/schema.ts)

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "password_hash" varchar(255);

CREATE TABLE IF NOT EXISTS "customer_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "token" varchar(255) NOT NULL UNIQUE,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "customer_sessions_token_idx" ON "customer_sessions" ("token");
CREATE INDEX IF NOT EXISTS "customer_sessions_customer_idx" ON "customer_sessions" ("customer_id");

CREATE TABLE IF NOT EXISTS "store_newsletter_signups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "store_newsletter_signups_email_idx" ON "store_newsletter_signups" ("email");
