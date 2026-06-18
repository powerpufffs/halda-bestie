import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "drizzle-kit";

loadLocalEnvFiles();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run Drizzle commands.");
}

const databaseUrl = new URL(process.env.DATABASE_URL);
databaseUrl.searchParams.delete("sslrootcert");
if (databaseUrl.hostname.endsWith(".psdb.cloud") && !databaseUrl.searchParams.has("sslnegotiation")) {
  databaseUrl.searchParams.set("sslnegotiation", "direct");
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
    url: databaseUrl.toString(),
  },
});

function loadLocalEnvFiles(): void {
  for (const filePath of [".env.local", ".env", join("agent", ".env")]) {
    if (!existsSync(filePath)) continue;

    for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed || process.env[parsed.key] !== undefined) continue;
      process.env[parsed.key] = parsed.value;
    }
  }
}

function parseEnvLine(line: string): { key: string; value: string } | undefined {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return undefined;

  const withoutExport = trimmed.startsWith("export ") ? trimmed.slice("export ".length).trim() : trimmed;
  const separator = withoutExport.indexOf("=");
  if (separator <= 0) return undefined;

  const key = withoutExport.slice(0, separator).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return undefined;

  return {
    key,
    value: unquoteEnvValue(withoutExport.slice(separator + 1).trim()),
  };
}

function unquoteEnvValue(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).replaceAll("\\n", "\n");
  }

  return value;
}
