import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface AppEnv {
  databaseUrl: string;
  appUrl?: string;
  appSecret?: string;
  nylasApiKey?: string;
  nylasClientId?: string;
  nylasApiUri: string;
  nylasWebhookSecret?: string;
  nylasScopes: string[];
  nylasHaldaInboxGrantId?: string;
  haldaInboxEmail?: string;
  haldaSmsPhoneNumber?: string;
  llmApiKey?: string;
  llmBaseUrl?: string;
  llmModel?: string;
}

export function readAppEnv(): AppEnv {
  loadSharedEnvFiles();

  return {
    databaseUrl: requireEnv("DATABASE_URL"),
    appUrl: readEnv(process.env.NEXT_PUBLIC_APP_URL),
    appSecret: readEnv(process.env.APP_SECRET),
    nylasApiKey: readEnv(process.env.NYLAS_API_KEY),
    nylasClientId: readEnv(process.env.NYLAS_CLIENT_ID),
    nylasApiUri: readEnv(process.env.NYLAS_API_URI) ?? "https://api.us.nylas.com",
    nylasWebhookSecret: readEnv(process.env.NYLAS_WEBHOOK_SECRET),
    nylasScopes: readCsv(process.env.NYLAS_SCOPES),
    nylasHaldaInboxGrantId: readEnv(process.env.NYLAS_HALDA_INBOX_GRANT_ID),
    haldaInboxEmail: readEnv(process.env.HALDA_INBOX_EMAIL),
    haldaSmsPhoneNumber: readEnv(process.env.HALDA_SMS_PHONE_NUMBER),
    llmApiKey: readEnv(process.env.LLM_API_KEY),
    llmBaseUrl: readEnv(process.env.LLM_BASE_URL),
    llmModel: readEnv(process.env.LLM_MODEL),
  };
}

export function requireNylasApiEnv() {
  const env = readAppEnv();
  if (!env.nylasApiKey) {
    throw new Error("NYLAS_API_KEY is required for Nylas email access.");
  }

  return {
    ...env,
    nylasApiKey: env.nylasApiKey,
  };
}

export function requireNylasOAuthEnv() {
  const env = requireNylasApiEnv();
  if (!env.nylasClientId) {
    throw new Error("NYLAS_CLIENT_ID is required for Nylas OAuth inbox connection.");
  }

  return {
    ...env,
    nylasClientId: env.nylasClientId,
  };
}

let sharedEnvLoaded = false;

function loadSharedEnvFiles(): void {
  if (sharedEnvLoaded) return;
  sharedEnvLoaded = true;

  for (const filePath of candidateEnvFiles()) {
    if (!existsSync(filePath)) continue;
    loadEnvFile(filePath);
  }
}

function candidateEnvFiles(): string[] {
  const cwd = process.cwd();

  return unique([
    join(cwd, ".env.local"),
    join(cwd, ".env"),
    join(cwd, "..", ".env.local"),
    join(cwd, "..", ".env"),
    join(cwd, "agent", ".env"),
    join(cwd, "..", "agent", ".env"),
  ]);
}

function loadEnvFile(filePath: string): void {
  const contents = readFileSync(filePath, "utf8");

  for (const line of contents.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed || process.env[parsed.key] !== undefined) continue;
    process.env[parsed.key] = parsed.value;
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

function readEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function requireEnv(key: string): string {
  const value = readEnv(process.env[key]);
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function readCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
