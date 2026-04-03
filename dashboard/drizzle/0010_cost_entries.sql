-- Cost entries: costs, debts, payments (Task 4)
CREATE TABLE IF NOT EXISTS "cost_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" varchar(20) NOT NULL,
  "description" text NOT NULL,
  "amount" numeric(12, 2) NOT NULL,
  "template_id" uuid,
  "product_id" uuid,
  "creditor_name" varchar(255),
  "due_date" timestamp,
  "is_paid" boolean DEFAULT false NOT NULL,
  "paid_at" timestamp,
  "paid_amount" numeric(12, 2),
  "related_debt_id" uuid,
  "created_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);

DO $$ BEGIN
  ALTER TABLE "cost_entries" ADD CONSTRAINT "cost_entries_template_id_inventory_templates_id_fk"
    FOREIGN KEY ("template_id") REFERENCES "inventory_templates"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "cost_entries" ADD CONSTRAINT "cost_entries_product_id_products_id_fk"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "cost_entries" ADD CONSTRAINT "cost_entries_created_by_users_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "cost_entries" ADD CONSTRAINT "cost_entries_related_debt_id_cost_entries_id_fk"
    FOREIGN KEY ("related_debt_id") REFERENCES "cost_entries"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "cost_entries_type_idx" ON "cost_entries" ("type");
CREATE INDEX IF NOT EXISTS "cost_entries_template_idx" ON "cost_entries" ("template_id");
CREATE INDEX IF NOT EXISTS "cost_entries_is_paid_idx" ON "cost_entries" ("is_paid");
CREATE INDEX IF NOT EXISTS "cost_entries_related_debt_idx" ON "cost_entries" ("related_debt_id");
