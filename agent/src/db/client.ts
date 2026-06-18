import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export type Database = ReturnType<typeof createDatabase>;

export function createDatabase(databaseUrl: string) {
  const client = postgres(sanitizeDatabaseUrl(databaseUrl), {
    max: 1,
    prepare: false,
  });

  return drizzle(client);
}

function sanitizeDatabaseUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.delete("sslrootcert");
  if (url.hostname.endsWith(".psdb.cloud") && !url.searchParams.has("sslnegotiation")) {
    url.searchParams.set("sslnegotiation", "direct");
  }
  return url.toString();
}
