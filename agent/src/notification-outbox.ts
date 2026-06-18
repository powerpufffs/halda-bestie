import { sql, type SQL } from "drizzle-orm";
import { createDatabase } from "./db/client.ts";

interface OutboxRow {
  id: string;
  destination: string | null;
  body: string;
}

interface SendableApp {
  space: {
    create: (user: string) => Promise<{
      send: (content: string) => Promise<unknown>;
    }>;
  };
}

type RowExecutor = <T>(query: SQL) => Promise<T[]>;

export function startNotificationOutboxWorker(input: {
  app: unknown;
  channel: "imessage" | "terminal";
  databaseUrl?: string;
}): void {
  if (input.channel !== "imessage" || !input.databaseUrl) return;

  const app = asSendableApp(input.app);
  if (!app) return;

  const db = createDatabase(input.databaseUrl);
  const rows: RowExecutor = async <T>(query: SQL) => (await db.execute(query)) as unknown as T[];

  const tick = () => {
    drainOutbox({ app, rows, channel: "imessage" }).catch((error) => {
      console.error("[halda] notification outbox worker failed", error);
    });
  };

  setInterval(tick, 5_000);
  tick();
}

async function drainOutbox(input: {
  app: SendableApp;
  rows: RowExecutor;
  channel: "imessage";
}): Promise<void> {
  const messages = await input.rows<OutboxRow>(sql`
    select id,
           destination,
           body
    from halda.notification_outbox
    where status = 'queued'
      and reason = 'web_sms_verification'
      and channel = ${input.channel}
      and coalesce(scheduled_for, now()) <= now()
      and deleted_at is null
    order by created_at asc
    limit 5
  `);

  for (const message of messages) {
    // eslint-disable-next-line no-await-in-loop -- preserve outbox order and avoid burst sends.
    await deliverOutboxMessage(input.app, input.rows, message);
  }
}

async function deliverOutboxMessage(
  app: SendableApp,
  rows: RowExecutor,
  message: OutboxRow,
): Promise<void> {
  try {
    if (!message.destination) throw new Error("missing destination");
    const space = await app.space.create(message.destination);
    await space.send(message.body);
    await rows(sql`
      update halda.notification_outbox
      set status = 'sent',
          sent_at = now(),
          modified_at = now()
      where id = ${message.id}::uuid
    `);
    console.log("[halda] sent queued verification sms", {
      id: message.id,
      destination: message.destination,
    });
  } catch (error) {
    await rows(sql`
      update halda.notification_outbox
      set status = 'failed',
          error = ${error instanceof Error ? error.message : String(error)},
          modified_at = now()
      where id = ${message.id}::uuid
    `);
  }
}

function asSendableApp(value: unknown): SendableApp | undefined {
  if (!value || typeof value !== "object") return undefined;
  const maybeApp = value as { space?: unknown };
  if (!maybeApp.space || typeof maybeApp.space !== "object") return undefined;
  const maybeSpace = maybeApp.space as { create?: unknown };
  if (typeof maybeSpace.create !== "function") return undefined;

  return value as SendableApp;
}
