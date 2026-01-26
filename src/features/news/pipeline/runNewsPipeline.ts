"use server";

import { EVENT_LOOKBACK_HOURS, FEED_URLS, MAX_LLM_CALLS_PER_RUN } from "../config";
import { ingestFeeds } from "../ingest/rss";
import { upsertEventsFromArticles } from "../cluster/cluster";
import { assignGeoToEvents } from "../geo/geo";
import { summariseEvent } from "../llm/summariseEvent";

type RawArticleRecord = {
  title?: string | null;
  content?: string | null;
  publishedAt?: Date | null;
  createdAt?: Date | null;
  url?: string | null;
  source?: string | null;
};

type EventRecord = {
  id: string;
  title?: string | null;
  countries?: string[] | null;
  theatres?: string[] | null;
  lat?: number | null;
  lng?: number | null;
  updatedAt?: Date | null;
};

type BasePrisma = Parameters<typeof ingestFeeds>[1] &
  Parameters<typeof upsertEventsFromArticles>[1] &
  Parameters<typeof assignGeoToEvents>[1] &
  Parameters<typeof summariseEvent>[2];

type PrismaLike = BasePrisma & {
  rawArticle: BasePrisma["rawArticle"] & {
    findMany: (args: {
      where: Record<string, unknown>;
      orderBy?: Array<Record<string, "asc" | "desc">>;
      take?: number;
      select?: Record<string, boolean>;
    }) => Promise<RawArticleRecord[]>;
  };
  event: BasePrisma["event"] & {
    findMany: (args: {
      where: Record<string, unknown>;
      orderBy?: Record<string, "asc" | "desc">;
      select: Record<string, boolean>;
    }) => Promise<EventRecord[]>;
  };
};

type LlmClient = Parameters<typeof summariseEvent>[3];

export type NewsPipelineMetrics = {
  timingsMs: {
    ingest: number;
    loadArticles: number;
    cluster: number;
    geo: number;
    llm: number;
    total: number;
  };
  counts: {
    feedsProcessed: number;
    feedsFailed: number;
    articlesLoaded: number;
    articlesSkipped: number;
    eventsCreated: number;
    eventsUpdated: number;
    geoUpdated: number;
    geoSkipped: number;
    llmCalls: number;
    llmSkipped: number;
    llmFailed: number;
  };
};

const nowMs = (): number => Date.now();

const ensureServerOnly = (): void => {
  if (typeof window !== "undefined") {
    throw new Error("runNewsPipeline must run on the server.");
  }
};

const buildLookbackDate = (hours: number): Date => {
  const ms = hours * 60 * 60 * 1000;
  return new Date(Date.now() - ms);
};

const fetchRecentArticles = async (
  prisma: PrismaLike,
  since: Date,
): Promise<RawArticleRecord[]> =>
  prisma.rawArticle.findMany({
    where: {
      OR: [
        { publishedAt: { gte: since } },
        { publishedAt: null, createdAt: { gte: since } },
      ],
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    select: {
      title: true,
      content: true,
      publishedAt: true,
      createdAt: true,
      url: true,
      source: true,
    },
  });

const fetchRecentEvents = async (
  prisma: PrismaLike,
  since: Date,
): Promise<EventRecord[]> =>
  prisma.event.findMany({
    where: { updatedAt: { gte: since } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      countries: true,
      theatres: true,
      lat: true,
      lng: true,
      updatedAt: true,
    },
  });

const fetchRelatedArticles = async (
  prisma: PrismaLike,
  event: EventRecord,
  since: Date,
  limit: number,
): Promise<RawArticleRecord[]> => {
  const countries = event.countries?.filter(Boolean) ?? [];
  const filters =
    countries.length > 0
      ? countries.flatMap((country) => [
          { title: { contains: country, mode: "insensitive" } },
          { content: { contains: country, mode: "insensitive" } },
        ])
      : [];

  return prisma.rawArticle.findMany({
    where: {
      OR: [
        { publishedAt: { gte: since } },
        { publishedAt: null, createdAt: { gte: since } },
      ],
      ...(filters.length > 0 ? { AND: [{ OR: filters }] } : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      title: true,
      content: true,
      publishedAt: true,
      createdAt: true,
      url: true,
      source: true,
    },
  });
};

export const runNewsPipeline = async ({
  prisma,
  llm,
  feeds = FEED_URLS,
  lookbackHours = EVENT_LOOKBACK_HOURS,
  maxLlmCalls = MAX_LLM_CALLS_PER_RUN,
  topArticlesPerEvent = 5,
}: {
  prisma: PrismaLike;
  llm?: LlmClient;
  feeds?: string[];
  lookbackHours?: number;
  maxLlmCalls?: number;
  topArticlesPerEvent?: number;
}): Promise<NewsPipelineMetrics> => {
  ensureServerOnly();
  const totalStart = nowMs();
  const since = buildLookbackDate(lookbackHours);

  const ingestStart = nowMs();
  const ingestMetrics = await ingestFeeds(feeds, prisma);
  const ingestTime = nowMs() - ingestStart;

  const loadStart = nowMs();
  const recentArticles = await fetchRecentArticles(prisma, since);
  const loadTime = nowMs() - loadStart;

  const clusterStart = nowMs();
  const clusterMetrics = await upsertEventsFromArticles(
    recentArticles.map((article) => ({
      title: article.title,
      content: article.content,
      publishedAt: article.publishedAt ?? article.createdAt ?? null,
    })),
    prisma,
  );
  const clusterTime = nowMs() - clusterStart;

  const geoStart = nowMs();
  const recentEvents = await fetchRecentEvents(prisma, since);
  const geoMetrics = await assignGeoToEvents(recentEvents, prisma);
  const geoTime = nowMs() - geoStart;

  const llmStart = nowMs();
  let llmCalls = 0;
  let llmSkipped = 0;
  let llmFailed = 0;

  if (llm) {
    for (const event of recentEvents) {
      if (llmCalls >= maxLlmCalls) {
        break;
      }

      const related = await fetchRelatedArticles(
        prisma,
        event,
        since,
        topArticlesPerEvent,
      );
      try {
        const result = await summariseEvent(
          { id: event.id, title: event.title },
          related.map((article) => ({
            title: article.title ?? undefined,
            excerpt: article.content ?? undefined,
            url: article.url ?? undefined,
            source: article.source ?? undefined,
          })),
          prisma,
          llm,
        );

        if (result.skipped) {
          llmSkipped += 1;
          continue;
        }

        llmCalls += 1;
        if (!result.payload) {
          llmFailed += 1;
        }
      } catch {
        llmFailed += 1;
        continue;
      }
    }
  }

  const llmTime = nowMs() - llmStart;
  const totalTime = nowMs() - totalStart;

  return {
    timingsMs: {
      ingest: ingestTime,
      loadArticles: loadTime,
      cluster: clusterTime,
      geo: geoTime,
      llm: llmTime,
      total: totalTime,
    },
    counts: {
      feedsProcessed: ingestMetrics.feedsProcessed,
      feedsFailed: ingestMetrics.feedsFailed,
      articlesLoaded: recentArticles.length,
      articlesSkipped: ingestMetrics.itemsSkipped,
      eventsCreated: clusterMetrics.created,
      eventsUpdated: clusterMetrics.updated,
      geoUpdated: geoMetrics.updated,
      geoSkipped: geoMetrics.skipped,
      llmCalls,
      llmSkipped,
      llmFailed,
    },
  };
};
