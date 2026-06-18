import { sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { readAppEnv } from "./env";

export type Database = ReturnType<typeof getDb>;

let db: ReturnType<typeof drizzle> | undefined;

export function getDb() {
  if (db) return db;

  const env = readAppEnv();
  const client = postgres(sanitizeDatabaseUrl(env.databaseUrl), {
    max: 5,
    prepare: false,
  });
  db = drizzle(client);

  return db;
}

export async function rows<T>(query: SQL): Promise<T[]> {
  return (await getDb().execute(query)) as unknown as T[];
}

export { sql };

function sanitizeDatabaseUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.delete("sslrootcert");
  return url.toString();
}
