# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Geopolitical intelligence dashboard (Next.js 16 / React 19 / TypeScript). Ingests RSS news feeds, clusters related stories into events, enriches with geographic data, and generates AI summaries. Deployed on Vercel at https://situation-room-eight.vercel.app/.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npx prisma generate  # Regenerate Prisma client (runs automatically on postinstall)
npx prisma migrate dev  # Run database migrations locally
```

No test framework is configured.

## Architecture

**Feature-based organization** under `src/features/`:

- `news/` — Backend pipeline with sequential stages:
  1. `ingest/rss.ts` — RSS feed ingestion (max 25 articles/feed, dedup by URL)
  2. `cluster/cluster.ts` — Groups articles into geopolitical events (48h lookback)
  3. `geo/geo.ts` — Geographic enrichment via Nominatim geocoding, cached in `GeoLookup` table
  4. `llm/summariseEvent.ts` — OpenAI Responses API with Zod-validated structured JSON output (max 20 calls/run)
  5. `pipeline/runNewsPipeline.ts` — Orchestrates all stages, returns detailed metrics

- `situation-room/` — Frontend dashboard:
  - `pages/SituationMonitor.tsx` — Main UI entry point
  - `components/` — Globe map (Three.js), news panels, event views
  - `hooks/` — Data fetching hooks
  - `data/` — Polymarket integration

**API routes** in `app/api/`:
- `POST /api/news/pipeline` — Triggers pipeline (requires `x-pipeline-secret` header)
- `GET /api/news/events` — Returns processed events (ISR cached)
- `GET/POST /api/markets/*` — Finnhub market snapshots
- `GET/POST /api/polymarket/*` — Prediction market data

**Data flow:** Client loads a snapshot once on mount — no polling or focus refresh. Freshness is handled server-side via GitHub Actions cron (every 30min for news, every 5min for markets).

## Database

PostgreSQL via Supabase with Prisma ORM. Schema at `prisma/schema.prisma`.

Key models: `RawArticle`, `Event`, `EventOutput`, `GeoLookup`, `MarketSnapshot`, `PolymarketSnapshot`.

`DATABASE_URL` uses Supabase connection pooler; `DIRECT_URL` is for migrations.

## Key Patterns

- **Path alias:** `@/*` maps to project root (e.g., `@/src/lib/db`)
- **Cron auth:** Pipeline and refresh endpoints use header-based secrets (`x-cron-secret`, `x-pipeline-secret`) with TTL-based concurrency guards
- **UI components:** Shadcn/ui library in `src/components/ui/`
- **Auth:** NextAuth.js v4 with Google OAuth + email, Prisma adapter
- **LLM config:** Model set via `NEWS_LLM_MODEL` env var (default: `gpt-4.1-mini`), low temperature (0.2), Zod schema validation prevents hallucinated output

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health



## Workflow Orchestration

### 1. Plan Node Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One tack per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimat Impact**: Changes should only touch what's necessary. Avoid introducing bugs.