import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export type Database = ReturnType<typeof createDatabase>;

export function createDatabase(databaseUrl: string) {
  const client = postgres(sanitizeDatabaseUrl(databaseUrl), {
    max: 5,
    prepare: false,
  });

  return drizzle(client);
}

function sanitizeDatabaseUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.delete("sslrootcert");
  return url.toString();
}
