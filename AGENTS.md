# halda-bestie agent instructions

This repo is a small monorepo for the Halda HITLAB hackathon.

## Structure

- `app/` - Next.js App Router frontend with Tailwind CSS, nuqs, TanStack Query, Drizzle, and Zod.
- `agent/` - Spectrum-based messaging agent with Drizzle and Zod.
- `PLAN.md` - strategic product and architecture plan. Read it when changing product direction, schema, demo flows, or major architecture. Do not load it for routine edits.

## Operating Procedures

- Commit often and in logical chunks of work. Commits do not need to be perfectly atomic, but they should be easy to review.
- Check linting before committing.
- Prefer root commands through `just` when available.
- Keep files under 500 lines. If a file approaches the limit, split by responsibility before adding more.
- Keep secrets out of git. `.env` files are ignored and should stay local.
- Do not restructure unrelated areas while working on a focused task.
- Use the repo's existing patterns before introducing a new framework or abstraction.

## Common Commands

- `just install`
- `just dev-app`
- `just dev-agent`
- `just db-migrate`
- `just db-studio`
- `just lint`
- `just typecheck`
- `just check`

## Tooling

- Package manager: Bun.
- Database: Postgres with Drizzle. Use Drizzle for schema-aware database access and migrations. Keep shared migrations in `drizzle/` at the repo root, and run them with `bun run db:migrate` or `just db-migrate`.
- Runtime validation: Zod. Prefer Zod schemas for external input, environment/config validation, tool payloads, and DB-adjacent parsing in both `app/` and `agent/`.
- Frontend lint: Next.js ESLint config.
- Repo lint: Oxlint with correctness errors and a 500-line max-file rule.
