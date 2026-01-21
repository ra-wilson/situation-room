import { GEO_SEED_TERMS } from "./seedTerms";
import { fetchAllEventsForQuery } from "./fetchAllEvents";
import { toCandidateMarkets } from "./toCandidates";
import { filterCandidates } from "./filterCandidates";
import { rankCandidates } from "./rankCandidates";
import type { CandidateMarket } from "./candidateTypes";
import type { Event } from "./types";

const CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_MAX_PAGES = 2;
const DEFAULT_LIMIT_PER_TYPE = 10;
const DEFAULT_MAX_CANDIDATES = 50;

type DiscoverOptions = {
  concurrency?: number;
  maxPages?: number;
  limitPerType?: number;
  eventsStatus?: "active" | "closed";
  requireGeopoliticsTag?: boolean;
  maxCandidates?: number;
  forceRefresh?: boolean;
};

export type DiscoverResult = {
  candidates: CandidateMarket[];
  totalEventsFetched: number;
  totalCandidatesRaw: number;
  totalCandidatesDeduped: number;
  warning?: string;
};

let cache:
  | {
      expiresAt: number;
      data: CandidateMarket[];
      totalEventsFetched: number;
      totalCandidatesRaw: number;
      totalCandidatesDeduped: number;
    }
  | null = null;
let inFlight: Promise<DiscoverResult> | null = null;

const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const runWorker = async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  };

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runWorker());
  await Promise.all(workers);
  return results;
};

const pickBetterCandidate = (a: CandidateMarket, b: CandidateMarket): CandidateMarket => {
  const scoreA = a.volume24hr ?? a.volumeNum ?? a.liquidityNum ?? 0;
  const scoreB = b.volume24hr ?? b.volumeNum ?? b.liquidityNum ?? 0;
  return scoreB > scoreA ? b : a;
};

const dedupeCandidates = (candidates: CandidateMarket[]): CandidateMarket[] => {
  const byMarketId = new Map<string, CandidateMarket>();
  candidates.forEach((candidate) => {
    const existing = byMarketId.get(candidate.marketId);
    byMarketId.set(candidate.marketId, existing ? pickBetterCandidate(existing, candidate) : candidate);
  });

  const bySlug = new Map<string, CandidateMarket>();
  const noSlug: CandidateMarket[] = [];
  Array.from(byMarketId.values()).forEach((candidate) => {
    const slugKey = candidate.slug.trim();
    if (!slugKey) {
      noSlug.push(candidate);
      return;
    }
    const existing = bySlug.get(slugKey);
    bySlug.set(slugKey, existing ? pickBetterCandidate(existing, candidate) : candidate);
  });

  return [...noSlug, ...Array.from(bySlug.values())];
};

const fetchEventsForSeed = async (
  term: string,
  options: Required<Pick<DiscoverOptions, "maxPages" | "limitPerType" | "eventsStatus">>
): Promise<Event[]> => {
  try {
    const events = await fetchAllEventsForQuery(term, {
      maxPages: options.maxPages,
      limitPerType: options.limitPerType,
      eventsStatus: options.eventsStatus,
    });
    // eslint-disable-next-line no-console
    console.warn(`[polymarket] seed "${term}" fetched ${events.length} events`);
    return events;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`[polymarket] seed "${term}" failed`, error);
    return [];
  }
};

const computeDiscover = async (options: DiscoverOptions): Promise<DiscoverResult> => {
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
  const limitPerType = options.limitPerType ?? DEFAULT_LIMIT_PER_TYPE;
  const eventsStatus = options.eventsStatus ?? "active";
  const maxCandidates = options.maxCandidates ?? DEFAULT_MAX_CANDIDATES;

  const eventsBySeed = await mapWithConcurrency(GEO_SEED_TERMS, concurrency, (term) =>
    fetchEventsForSeed(term, { maxPages, limitPerType, eventsStatus })
  );
  const events = eventsBySeed.flat();
  const candidates = toCandidateMarkets(events);
  const deduped = dedupeCandidates(candidates);
  const filtered = filterCandidates(deduped, {
    requireGeopoliticsTag: options.requireGeopoliticsTag ?? false,
  });
  const ranked = rankCandidates(filtered).slice(0, maxCandidates);

  return {
    candidates: ranked,
    totalEventsFetched: events.length,
    totalCandidatesRaw: candidates.length,
    totalCandidatesDeduped: deduped.length,
  };
};

export const getDiscoverResults = async (options: DiscoverOptions = {}): Promise<DiscoverResult> => {
  const now = Date.now();
  const forceRefresh = options.forceRefresh ?? false;

  if (forceRefresh) {
    inFlight = null;
  } else {
    if (cache && now < cache.expiresAt) {
      return {
        candidates: cache.data,
        totalEventsFetched: cache.totalEventsFetched,
        totalCandidatesRaw: cache.totalCandidatesRaw,
        totalCandidatesDeduped: cache.totalCandidatesDeduped,
      };
    }
    if (inFlight) {
      return inFlight;
    }
  }

  const computePromise = computeDiscover(options);
  inFlight = computePromise;

  try {
    const result = await computePromise;
    cache = {
      data: result.candidates,
      expiresAt: now + CACHE_TTL_MS,
      totalEventsFetched: result.totalEventsFetched,
      totalCandidatesRaw: result.totalCandidatesRaw,
      totalCandidatesDeduped: result.totalCandidatesDeduped,
    };
    inFlight = null;
    return result;
  } catch (error) {
    inFlight = null;
    if (cache) {
      return {
        candidates: cache.data,
        totalEventsFetched: cache.totalEventsFetched,
        totalCandidatesRaw: cache.totalCandidatesRaw,
        totalCandidatesDeduped: cache.totalCandidatesDeduped,
        warning: "Discover failed, returning cached results.",
      };
    }
    return {
      candidates: [],
      totalEventsFetched: 0,
      totalCandidatesRaw: 0,
      totalCandidatesDeduped: 0,
      warning: "Discover failed with no cache available.",
    };
  }
};
