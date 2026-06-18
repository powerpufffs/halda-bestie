set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

default:
    just --list

install:
    bun install

dev-agent:
    bun run --cwd agent dev

dev-app:
    bun run --cwd app dev

lint:
    bun run lint
    bun run lint:app

typecheck:
    bun run typecheck

build-app:
    bun run build:app

check:
    just lint
    just typecheck
