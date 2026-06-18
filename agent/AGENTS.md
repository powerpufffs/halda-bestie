# halda-agent instructions

This is a [Spectrum](https://photon.codes/docs/spectrum-ts) app, pinned to `spectrum-ts@^4.2.0`. The entry point is `src/index.ts`, which configures the iMessage provider and runs the agent loop.

## Working in this project

- Run the app with `bun run start`.
- Add providers by importing them in `src/index.ts` and listing them in the `Spectrum({ providers: [...] })` config.
- Outgoing message content uses the builders documented in the skill (text, attachment, voice, contact, richlink, poll, group, custom).
- Lifecycle-specific behavior lives under `src/agent/profiles`.
- Global and lifecycle tools live under `src/tools`.

## Conversation architecture

- Do not build conversational replies with deterministic intent functions, hardcoded templates, or `answerForIntent`-style branches.
- TypeScript owns routing, state machines, database writes, tool selection, and structured validation. The LLM owns natural language.
- If the agent needs to remember something, expose a small tool or structured state update. Do not parse subjective conversation preferences with regex/if-else rules.
- Tone and personality adjustments must go through `update_communication_style`; prompts can instruct the model how to use it, but code should not map phrases like "less slang" or "don't roast me" into profile fields.
- Intent routing may use simple deterministic signals only to decide which prompt slice and tools are available. It must not generate the reply text.
- Agent-driven goals belong in persisted open loops / priorities and injected prompt directives, not in scripted multi-turn copy.
- Emergency fallback copy is allowed only for LLM failure paths. Do not expand fallback logic into a parallel chatbot.

## Environment

This project reads secrets from `.env` (gitignored). **Do not read, write, or echo `.env`** — it contains credentials.

If startup fails with an authentication error, tell the user to verify their `PROJECT_ID` / `PROJECT_SECRET` at the [Photon dashboard](https://app.photon.codes).

LLM provider config is intentionally provider-neutral. Use `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL` for OpenAI-compatible providers; do not add provider-specific env names such as `MOONSHOT_API_KEY` unless there is a hard requirement.

## Spectrum SDK reference

This project includes the `spectrum` skill from [`photon-hq/skills`](https://github.com/photon-hq/skills). Your agent should auto-discover it. If it doesn't, or if you switch agents, install for your agent with:

```sh
npx skills add photon-hq/skills --skill spectrum --agent <your-agent>
```

(Use `--agent '*'` to install for all supported agents.)

## See also

- [Spectrum docs](https://photon.codes/docs/spectrum-ts)
- [`spectrum-ts` on GitHub](https://github.com/photon-hq/spectrum-ts)
