/**
 * Run the products table migration against Supabase Postgres.
 * Requires DATABASE_URL in env (Supabase Dashboard → Settings → Database → Connection string → URI).
 * Run from Farm-Fresh-Meats: node scripts/run-products-migration.js
 * Loads .env from Farm-Fresh-Meats if present.
 */
import "dotenv/config";
import pg from "pg";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const migrationPath = join(__dirname, "../supabase/migrations/002_products_table.sql");

async function main() {
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error("Missing DATABASE_URL or SUPABASE_DB_URL.");
    console.error("Get it from: Supabase Dashboard → Project → Settings → Database → Connection string → URI");
    process.exit(1);
  }

  const sql = readFileSync(migrationPath, "utf8");
  const client = new pg.Client({ connectionString: url });

  try {
    await client.connect();
    await client.query(sql);
    console.log("Migration 002_products_table.sql ran successfully.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
