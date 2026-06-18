# Next by Halda

Monorepo for the Halda HITLAB hackathon demo.

## Structure

- `app/` - Next.js App Router frontend.
- `agent/` - Spectrum messaging agent.
- `drizzle/` - shared Postgres migrations.

## Local Setup

Install dependencies from the repo root:

```sh
bun install
```

Create local env files:

```sh
cp agent/.env.example agent/.env
```

Fill `agent/.env` with Spectrum credentials from the Photon dashboard:

- `PROJECT_ID`
- `PROJECT_SECRET`
- `DATABASE_URL`

Optionally configure an OpenAI-compatible LLM provider for agent reasoning:

- `LLM_API_KEY`
- `LLM_BASE_URL`
- `LLM_MODEL`

For Kimi/Moonshot, use `LLM_BASE_URL=https://api.moonshot.ai/v1` and the model name you want to run, such as `kimi-k2.6`. Leave all `LLM_*` values blank to run the deterministic scaffold without an LLM.

Set the same `DATABASE_URL` in your shell before running database commands:

```sh
export DATABASE_URL="postgres://USER:PASSWORD@HOST:PORT/DB_NAME"
```

Apply the initial Drizzle migration:

```sh
just db-migrate
```

Run the app and agent in separate terminals:

```sh
just dev-app
```

```sh
just dev-agent
```

For local iMessage testing, run:

```sh
bun run --cwd agent start:local
```

Local iMessage mode reads this Mac's Messages database. Before using it, grant Full Disk Access to the app running the process: System Settings -> Privacy & Security -> Full Disk Access, then add your terminal or IDE. Restart that app after changing the setting.

If startup says it cannot find `better_sqlite3.node`, rebuild the native SQLite binding:

```sh
just repair-imessage-native
```

For cloud-mode agent testing, run:

```sh
bun run --cwd agent start:cloud
```

## Local Test Checklist

Before handing off a local change:

```sh
just lint
just typecheck
just test-onboarding
bunx drizzle-kit check --dialect postgresql --out drizzle
```

Manual smoke test:

1. Open `http://localhost:3000` and confirm the app loads.
2. Start the agent with `just dev-agent`.
3. Send a message through the configured Spectrum/iMessage channel.
4. Confirm the agent responds.
5. Confirm the database contains the expected rows in `halda.users`, `halda.user_messaging_identities`, `halda.conversations`, `halda.conversation_states`, `halda.user_profiles`, `halda.agent_open_loops`, and `halda.agent_events`.

Use Drizzle Studio when you want to inspect local DB state visually:

```sh
just db-studio
```

Onboarding state smoke test:

```sh
just test-onboarding
```

This simulates a newcomer asking a college question, changing topics while the onboarding question remains pending, and then answering with a grade. Passing means the agent can complete onboarding with role, college intent, likely grade/year, active goal stack, and profile memory updates. The smoke test uses the in-memory store intentionally. The live agent uses the Drizzle/Postgres state store when `DATABASE_URL` is set, which makes onboarding memory, open loops, profile updates, and event logs survive restarts.

## Production Testing

Production testing should use production-like services, but never local secrets committed to git.

Required production environment:

- `DATABASE_URL` is configured for the production Postgres database.
- `PROJECT_ID` and `PROJECT_SECRET` are configured for the production Spectrum/Photon project.
- `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL` are configured for the OpenAI-compatible LLM provider when production should use model reasoning.
- `IMESSAGE_MODE=cloud` for the deployed agent path.
- `ALLOWED_SENDERS` is set when the demo should only respond to known phone numbers.

Deploy or start the app using the host's normal flow. For a Vercel-backed app, verify the deployment URL after build. For the agent process, run cloud mode:

```sh
bun run --cwd agent start:cloud
```

Apply migrations against production only after confirming `DATABASE_URL` points at the intended database:

```sh
bun run db:migrate
```

Production smoke test:

1. Open the production app URL and confirm the page loads without console or server errors.
2. Send a message from an allowed sender through the configured Spectrum/iMessage channel.
3. Confirm the production agent replies in the same channel.
4. Confirm the production database has the migration ledger row in `halda.__drizzle_migrations`.
5. Confirm seeded platforms exist in `halda.messaging_platforms`: `gmail`, `website`, `mobile_app`, `sms`, and `imessage`.
6. Confirm the inbound test created or updated rows in `halda.user_profiles`, `halda.conversation_states`, `halda.agent_open_loops`, and `halda.agent_events`.

## Common Commands

```sh
just install
just dev-app
just dev-agent
just db-migrate
just db-studio
just repair-imessage-native
just test-onboarding
just lint
just typecheck
just check
```
