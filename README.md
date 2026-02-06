# Geopolitics Situation Room

A geopolitical intelligence dashboard that ingests live news feeds, clusters related stories into events, enriches them with geographic context, and generates structured summaries using AI.

Built as a product experiment to explore how raw news can be transformed into clear, decision-ready insights for non-experts.

MVP: https://situation-room-eight.vercel.app/

## Purpose

News is fragmented and noisy. This project answers:

How can we turn continuous global news into structured geopolitical events that are easy to understand and prioritise?

The system focuses on:
- grouping related stories into single events
- providing neutral summaries and historical context
- visualising where events are happening
- indicating severity for prioritisation

## Features

- News ingestion pipeline
  - Fetches multiple RSS feeds (e.g. BBC, Guardian, Al Jazeera, Reuters when available)
  - Deduplicates and stores articles
  - Tracks feed failures and pipeline metrics

- Event clustering
  - Groups related articles into geopolitical events
  - Updates existing events as new stories arrive

- Geographic enrichment
  - Infers country/location from content
  - Assigns latitude and longitude
  - Displays events on an interactive world map

- AI summarisation (structured output)
  - Generates JSON per event:
    - summary
    - historical context
    - severity (low / medium / high)
    - sources (restricted to ingested URLs)
  - Zod validation rejects malformed or hallucinated output

- Interactive dashboard
  - Event list view (scan headlines quickly)
  - Detail view (summary + historical context + sources)
  - Map pins for event locations
  - Severity indicators

## Tech Stack

Frontend
- Next.js (App Router)
- TypeScript
- Tailwind CSS

Backend
- Next.js API routes
- Prisma ORM
- PostgreSQL (Supabase)

AI Layer
- OpenAI Responses API
- Zod schema validation

## Environment

Prisma runtime connections should go through the Supabase pooler, while migrations should use the direct database host.

Example:
```env
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"
```

## Design Decisions

- Grounded AI: summaries are generated only from ingested articles, not from open-ended “what’s happening today” prompts.
- Batch processing: pipeline runs on demand (and can be scheduled) rather than streaming, for predictable cost and simplicity.
- Metrics-first pipeline: each stage reports timings, counts, and failures for observability.
- Data freshness model: the client loads a snapshot once on mount. Freshness is handled server-side (cron + revalidation). There is no client polling, no focus refresh, and no time-driven UI updates.
