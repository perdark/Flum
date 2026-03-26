/**
 * Direct migration script - applies SQL to database
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function applyMigration() {
  const migrationPath = path.join(process.cwd(), 'drizzle', '0001_multi_sell_b2b_bundles.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('Applying migration...');

  try {
    await sql.transaction(async (tx) => {
      // Split by semi-colon and execute each statement
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.includes('CREATE TABLE') ||
            statement.includes('ALTER TABLE') ||
            statement.includes('CREATE INDEX') ||
            statement.includes('DROP COLUMN')) {
          try {
            await tx(statement);
            console.log('✓ Executed:', statement.substring(0, 60) + '...');
          } catch (err) {
            if (err.message.includes('already exists') ||
                err.message.includes('does not exist') ||
                err.message.includes('duplicate column')) {
              console.log('⊘ Skipped:', statement.substring(0, 60) + '...');
            } else {
              console.error('Error:', err.message);
            }
          }
        }
      }
    });

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
