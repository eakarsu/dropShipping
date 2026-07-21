import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (process.env.NODE_ENV === "production" && !connectionString) {
  throw new Error("DATABASE_URL is required in production");
}

const globalForPool = globalThis as unknown as { __pgPool?: Pool };

export const pool =
  globalForPool.__pgPool ??
  new Pool({
    connectionString,
    max: 10,
    application_name: "dropship-manager",
    statement_timeout: 15_000,
  });

if (process.env.NODE_ENV !== "production") globalForPool.__pgPool = pool;

export const db = drizzle(pool, { schema });
export { schema };
