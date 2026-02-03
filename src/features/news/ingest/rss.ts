import Parser from "rss-parser";

import { MAX_ARTICLES_PER_FEED } from "../config";

export type IngestMetrics = {
  feedsProcessed: number;
  feedsFailed: number;
  failedFeedUrls: string[];
  failedFeedErrors: Array<{ url: string; error: string }>;
  failedFeedStatuses: Array<{ url: string; status: number }>;
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

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
};

const truncateMessage = (value: string, max = 200): string =>
  value.length > max ? `${value.slice(0, max - 3)}...` : value;

const validateFeedUrl = async (
  feedUrl: string,
): Promise<{ ok: true } | { ok: false; status?: number; error?: string }> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(feedUrl, { signal: controller.signal });
    if (!response.ok) {
      return { ok: false, status: response.status };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: truncateMessage(toErrorMessage(error)) };
  } finally {
    clearTimeout(timeout);
  }
};

export const validateFeeds = async (
  feeds: string[],
): Promise<{ okFeeds: string[]; badFeeds: Array<{ url: string; error: string }> }> => {
  const results = await Promise.all(
    feeds.map(async (url) => ({ url, result: await validateFeedUrl(url) })),
  );

  const okFeeds: string[] = [];
  const badFeeds: Array<{ url: string; error: string }> = [];

  for (const { url, result } of results) {
    if (result.ok) {
      okFeeds.push(url);
      continue;
    }
    if (typeof result.status === "number") {
      badFeeds.push({ url, error: `HTTP ${result.status}` });
    } else {
      badFeeds.push({ url, error: result.error ?? "Unknown error" });
    }
  }

  return { okFeeds, badFeeds };
};

export const ingestFeeds = async (
  feeds: string[],
  prisma: PrismaLike,
): Promise<IngestMetrics> => {
  const metrics: IngestMetrics = {
    feedsProcessed: 0,
    feedsFailed: 0,
    failedFeedUrls: [],
    failedFeedErrors: [],
    failedFeedStatuses: [],
    itemsFetched: 0,
    itemsSkipped: 0,
    itemsUpserted: 0,
    upsertErrors: 0,
  };

  for (const feedUrl of feeds) {
    const validation = await validateFeedUrl(feedUrl);
    if (!validation.ok) {
      metrics.feedsFailed += 1;
      metrics.failedFeedUrls.push(feedUrl);
      if (typeof validation.status === "number") {
        metrics.failedFeedStatuses.push({
          url: feedUrl,
          status: validation.status,
        });
      } else {
        metrics.failedFeedErrors.push({
          url: feedUrl,
          error: validation.error ?? "Unknown error",
        });
      }
      continue;
    }

    let feed;
    try {
      feed = await parser.parseURL(feedUrl);
      metrics.feedsProcessed += 1;
    } catch (error) {
      metrics.feedsFailed += 1;
      metrics.failedFeedUrls.push(feedUrl);
      metrics.failedFeedErrors.push({
        url: feedUrl,
        error: truncateMessage(toErrorMessage(error)),
      });
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
