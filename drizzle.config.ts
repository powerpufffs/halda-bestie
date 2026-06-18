import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run Drizzle commands.");
}

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle",
  schemaFilter: ["halda"],
  migrations: {
    schema: "halda",
    table: "__drizzle_migrations",
  },
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
