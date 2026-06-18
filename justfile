set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

default:
    just --list

install:
    bun install

dev-agent:
    bun run --cwd agent dev

dev-app:
    bun run --cwd app dev

db-migrate:
    bun run db:migrate

db-studio:
    bun run db:studio

repair-imessage-native:
    bun run repair:imessage-native

lint:
    bun run lint
    bun run lint:app

typecheck:
    bun run typecheck

test-onboarding:
    bun run test:onboarding

build-app:
    bun run build:app

check:
    just lint
    just typecheck
