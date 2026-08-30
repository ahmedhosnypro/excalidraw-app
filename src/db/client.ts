import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";

/**
 * Database client (singleton).
 *
 * Currently uses @libsql/client (SQLite, pure-JS — no native modules).
 * To switch to Postgres later: replace `createClient` with a `pg` Pool and
 * `drizzle-orm/node-postgres` (or `postgres-js`), and update the schema table
 * builders in `./schema`. The rest of the application code is driver-agnostic.
 *
 * Note: Drizzle's relational query builder (`db.query.*`) is not wired up here
 * in the rc.4 libsql driver; we use the SQL-style query API (`db.select()`)
 * which is fully type-safe and portable across dialects.
 */
function createDb() {
  const url = process.env.DATABASE_URL ?? "file:db/excalidraw.db";
  const client: Client = createClient({ url });
  return drizzle({ client });
}

export type Database = ReturnType<typeof createDb>;

const globalForDb = globalThis as unknown as { db?: Database };

export const db: Database = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}
