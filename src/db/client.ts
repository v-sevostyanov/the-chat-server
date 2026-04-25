import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type AppDb = NodePgDatabase<typeof schema>;

export type DbClient = {
  readonly db: AppDb;
  readonly pool: Pool;
};

export function createDbClient(connectionString: string): DbClient {
  const pool = new Pool({
    connectionString,
  });

  const db = drizzle(pool, { schema });

  return { db, pool };
}

export async function checkDatabaseReadiness(db: AppDb): Promise<void> {
  await db.execute(sql`select 1`);
}
