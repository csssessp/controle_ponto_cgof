// One-off setup script: creates the `app_settings` key/value table used by
// server.ts (loadPinGoalsFromDb / PUT /api/pin-project/goals) to persist admin
// configuration (e.g. PIN monthly goals) across restarts. Until this table
// existed, that persistence silently failed every time (caught and ignored)
// and goals reset to hardcoded defaults on every deploy/restart.
//
// Safe to run multiple times — CREATE TABLE IF NOT EXISTS, no data loss.
// Usage: npx tsx create-app-settings-table.ts
//
// Note: as of this writing, DATABASE_URL in .env points at a malformed
// pooler hostname ("5432-us-east-1.pooler.supabase.com") so this script
// cannot currently reach the database — see create_app_settings_table.sql
// for the same statement to run manually via the Supabase SQL Editor instead.
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("🔧 Ensuring app_settings table exists...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key        TEXT PRIMARY KEY,
      value      JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(`ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;`);
  console.log("✅ app_settings table ready.");
}

main()
  .catch((e) => {
    console.error("❌ Failed to create app_settings table:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
