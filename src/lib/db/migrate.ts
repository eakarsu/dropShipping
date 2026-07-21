import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

async function main() {
  const state = await pool.query<{ legacy: string | null; journal: string | null }>(
    `SELECT to_regclass('public.users')::text AS legacy, to_regclass('drizzle.__drizzle_migrations')::text AS journal`,
  );
  if (state.rows[0]?.legacy && !state.rows[0]?.journal) {
    throw new Error("Unversioned legacy schema detected. Quarantine it and complete a reviewed import; automatic mutation is refused.");
  }
  await migrate(db, { migrationsFolder: "drizzle" });
}

main().then(() => pool.end()).catch(async (error) => { console.error(error); await pool.end(); process.exitCode = 1; });
