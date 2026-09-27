import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

// One pool per process. Cached on globalThis so dev hot-reloads don't leak
// connections. The pool connects lazily, so importing this module (e.g.
// during `next build`) doesn't require a reachable database.
const globalForDb = globalThis as unknown as { __gtbsPool?: Pool };

function createPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  return new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
}

const pool = globalForDb.__gtbsPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.__gtbsPool = pool;

export const db = drizzle(pool, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
