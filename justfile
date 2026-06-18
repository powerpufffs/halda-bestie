set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

default:
    just --list

install:
    bun install

dev-agent:
    bun run --cwd halda-agent dev

dev-frontend:
    bun run --cwd frontend dev

lint:
    bun run lint
    bun run lint:frontend

typecheck:
    bun run typecheck

build-frontend:
    bun run build:frontend

check:
    just lint
    just typecheck
