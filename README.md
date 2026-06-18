# CollegePath — Senior Year: Apply

A senior-year college application hub that answers one question: **"How do I actually
get in?"** It bundles five tools behind a single navigation shell.

Stack: **Next.js (App Router) · TypeScript · Tailwind CSS · TipTap**.

## Tools

| Route | Tool | What it does |
| --- | --- | --- |
| `/` | **Dashboard** | Overview + quick stats (activities, next deadline, offers) |
| `/essay` | **Essay Lab** | TipTap editor with inline grammar fixes, counselor advice + chat, a 1–100 score, and a docked counselor chatbot |
| `/activities` | **Activities Coaching** | Common App activities list (max 10) with impact-driven AI feedback + rewrites |
| `/interview` | **Interview Prep** | Practice common questions with feedback, plus school-specific tips |
| `/deadlines` | **Deadline Tracker** | Every school's deadline with live countdowns and submit tracking |
| `/decisions` | **Decision Support** | Compare offers + aid packages; net cost and best-value highlight |

Activities, deadlines, and offers persist in `localStorage` (keys in `lib/applyTypes.ts`).

## Install & run

```bash
npm install
npm run dev        # http://localhost:3000
```

## AI configuration (optional)

Every AI feature (essay analysis, the chats, activity/interview coaching) works with
**no API key** via deterministic simulators. To use a real LLM, copy `.env.example`
to `.env.local` and set `ANTHROPIC_API_KEY` (recommended) or `OPENAI_API_KEY`.

API routes: `app/api/analyze-essay`, `app/api/counselor-chat`, `app/api/essay-chat`,
`app/api/coach` (activities + interview).

## Structure

- `components/AppShell.tsx` — left-nav shell wrapping every page
- `components/EssayEditor.tsx` + `components/editor/*` — the Essay Lab
- `app/*/page.tsx` — one page per tool
- `lib/applyTypes.ts`, `lib/useLocalStorage.ts` — shared data + persistence
