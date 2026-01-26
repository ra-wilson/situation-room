import Parser from "rss-parser";

import { MAX_ARTICLES_PER_FEED } from "../config";

export type IngestMetrics = {
  feedsProcessed: number;
  feedsFailed: number;
  itemsFetched: number;
  itemsSkipped: number;
  itemsUpserted: number;
  upsertErrors: number;
};

type RawArticleUpsertArgs = {
  where: { url: string };
  update: {
    title: string;
    source?: string;
    publishedAt?: Date | null;
    content?: string | null;
  };
  create: {
    url: string;
    title: string;
    source?: string;
    publishedAt?: Date | null;
    content?: string | null;
  };
};

type PrismaLike = {
  rawArticle: {
    upsert: (args: RawArticleUpsertArgs) => Promise<unknown>;
  };
};

const parser = new Parser();

const toDate = (value?: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toHostname = (value?: string): string | undefined => {
  if (!value) return undefined;
  try {
    return new URL(value).hostname;
  } catch {
    return undefined;
  }
};

export const ingestFeeds = async (
  feeds: string[],
  prisma: PrismaLike,
): Promise<IngestMetrics> => {
  const metrics: IngestMetrics = {
    feedsProcessed: 0,
    feedsFailed: 0,
    itemsFetched: 0,
    itemsSkipped: 0,
    itemsUpserted: 0,
    upsertErrors: 0,
  };

  for (const feedUrl of feeds) {
    let feed;
    try {
      feed = await parser.parseURL(feedUrl);
      metrics.feedsProcessed += 1;
    } catch {
      metrics.feedsFailed += 1;
      continue;
    }

    const items = (feed.items ?? []).slice(0, MAX_ARTICLES_PER_FEED);
    metrics.itemsFetched += items.length;

    for (const item of items) {
      const url = item.link ?? item.guid ?? item.id;
      const title = item.title?.trim();

      if (!url || !title) {
        metrics.itemsSkipped += 1;
        continue;
      }

      const publishedAt =
        toDate(item.isoDate) ??
        toDate(item.pubDate) ??
        toDate((item as { published?: string }).published) ??
        toDate((item as { updated?: string }).updated);

      const source =
        toHostname(url) ?? feed.title ?? toHostname(feedUrl) ?? undefined;

      const content =
        item.contentSnippet ?? item.content ?? item.summary ?? null;

      try {
        await prisma.rawArticle.upsert({
          where: { url },
          update: {
            title,
            source,
            publishedAt,
            content,
          },
          create: {
            url,
            title,
            source,
            publishedAt,
            content,
          },
        });
        metrics.itemsUpserted += 1;
      } catch {
        metrics.upsertErrors += 1;
      }
    }
  }

  return metrics;
};
