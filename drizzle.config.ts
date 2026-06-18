import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run Drizzle commands.");
}

const databaseUrl = new URL(process.env.DATABASE_URL);
databaseUrl.searchParams.delete("sslrootcert");

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle",
  schemaFilter: ["halda"],
  migrations: {
    schema: "halda",
    table: "__drizzle_migrations",
  },
  dbCredentials: {
    url: databaseUrl.toString(),
  },
});
