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


## Design Decisions

- Grounded AI: summaries are generated only from ingested articles, not from open-ended “what’s happening today” prompts.
- Batch processing: pipeline runs on demand (and can be scheduled) rather than streaming, for predictable cost and simplicity.
- Metrics-first pipeline: each stage reports timings, counts, and failures for observability.
- Data freshness model: the client loads a snapshot once on mount. Freshness is handled server-side (cron + revalidation). There is no client polling, no focus refresh, and no time-driven UI updates.

## Future Improvements with Budget / Paid Tier

This project is intentionally scoped as a cost-aware MVP. All data sources and refresh strategies were chosen to remain within free-tier API limits and predictable infrastructure costs.

With additional budget or a paid tier, the system could be extended in the following ways:

## Live and High-Frequency Data
Replace snapshot-based market polling with streaming or near-real-time feeds:
- WebSockets for markets and prediction platforms
- Sub-minute refresh intervals for volatile events
- Support adaptive refresh rates, prioritising regions or assets experiencing rapid change.

## Broader OSINT Coverage
Ingest additional open-source intelligence feeds such as:
- Think tanks, policy institutes, and government briefings
- Conflict trackers and humanitarian organisations
- Curated regional news and local-language sources
- Apply source weighting and credibility scoring to distinguish signal from noise.

## Public Sentiment and Narrative Analysis
Integrate social-platform data (e.g. X / Grok APIs) to analyse:
- Public reaction to geopolitical events
- Narrative spread and sentiment shifts over time
- Early signals of escalation before they appear in mainstream reporting
- Aggregate sentiment at the event or region level, rather than raw post streams, to maintain clarity and avoid information overload.

## Deeper AI Analysis
Move beyond summarisation to:
- Narrative clustering (how different groups frame the same event)
- Contradiction and bias detection across sources
- Time-series analysis of escalation, de-escalation, and market impact
- Introduce explainable AI outputs, showing why an event is classified as high or medium severity.

## User-Facing Product Extensions
Personalised alerts based on regions, asset classes, or themes
Paid tiers for:
- Faster refresh rates
- Historical backfills
- Advanced sentiment and risk analysis
- Exportable data for analysts, researchers, or journalists.
