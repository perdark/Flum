import { getDb } from "./src/db/index";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  const res = await db.execute(sql.raw(`select "id", "name", "description", "fields_schema", "is_active", "multi_sell_enabled", "multi_sell_max", "cooldown_enabled", "cooldown_duration_hours", "color", "icon", "created_at", "updated_at" from "inventory_templates" LIMIT 1;`));
  console.log("SUCCESS, found", res.length, "rows.");
  process.exit(0);
}

main().catch((e) => {
  console.error("ACTUAL ERROR:", e);
  process.exit(1);
});
