# halda-agent

A [Spectrum](https://photon.codes/docs/spectrum-ts) project. Wired with iMessage and the Halda agent scaffold.

## Environment

Before running, open `.env` and fill in the values:

From your project Settings on the [Photon dashboard](https://app.photon.codes):

- `PROJECT_ID`
- `PROJECT_SECRET`

For durable agent memory:

- `DATABASE_URL`

Run `just db-migrate` from the repo root before starting the agent against a new database. When `DATABASE_URL` is set, onboarding memory, open loops, profile updates, and agent events are stored in Postgres. Without it, the agent falls back to in-memory state for quick local experiments.

For an OpenAI-compatible LLM provider:

- `LLM_API_KEY`
- `LLM_BASE_URL`
- `LLM_MODEL`

Example Kimi/Moonshot values:

```sh
LLM_BASE_URL=https://api.moonshot.ai/v1
LLM_MODEL=kimi-k2.6
```

Leave `LLM_*` blank to run the deterministic scaffold.

## Run

```sh
bun install
bun run start
```

For local iMessage mode:

```sh
bun run start:local
```

Grant Full Disk Access to the terminal or IDE running the process: System Settings -> Privacy & Security -> Full Disk Access. If startup cannot find the native SQLite binding, run this from the repo root:

```sh
just repair-imessage-native
```

## Where to go next

- [Spectrum docs](https://photon.codes/docs/spectrum-ts)
- Edit lifecycle profiles in `src/agent/profiles`.
- Edit tool registries in `src/tools`.
- Add more providers from `spectrum-ts/providers/*`.
