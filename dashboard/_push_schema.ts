import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const sql = `
    DO $$
    BEGIN
      -- Add columns to inventory_templates if they don't exist
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_templates' AND column_name='multi_sell_enabled') THEN
        ALTER TABLE inventory_templates ADD COLUMN multi_sell_enabled BOOLEAN NOT NULL DEFAULT false;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_templates' AND column_name='multi_sell_max') THEN
        ALTER TABLE inventory_templates ADD COLUMN multi_sell_max INTEGER NOT NULL DEFAULT 5;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_templates' AND column_name='cooldown_enabled') THEN
        ALTER TABLE inventory_templates ADD COLUMN cooldown_enabled BOOLEAN NOT NULL DEFAULT false;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_templates' AND column_name='cooldown_duration_hours') THEN
        ALTER TABLE inventory_templates ADD COLUMN cooldown_duration_hours INTEGER NOT NULL DEFAULT 12;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_templates' AND column_name='color') THEN
        ALTER TABLE inventory_templates ADD COLUMN color VARCHAR(20);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_templates' AND column_name='icon') THEN
        ALTER TABLE inventory_templates ADD COLUMN icon VARCHAR(50);
      END IF;

      -- Add composite index to inventory_items if it doesn't exist
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='inventory_items' AND indexname='inventory_items_template_status_idx') THEN
        CREATE INDEX inventory_items_template_status_idx ON inventory_items (template_id, status);
      END IF;
    END $$;
  `;

  await pool.query(sql);
  console.log("Schema changes applied successfully.");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
