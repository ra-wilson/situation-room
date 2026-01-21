import type { CandidateMarket } from "./candidateTypes";
import type { Event, Market } from "./types";
import { getTrend, getYesProbability } from "./parse";

const toNumberOrNull = (value: unknown): number | null => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const getEventTagSlugs = (event: Event): string[] => {
  if (!event.tags?.length) return [];
  return event.tags
    .map((tag) => tag.slug)
    .filter((slug): slug is string => Boolean(slug));
};

const isActiveMarket = (market: Market) => market.active === true && market.closed !== true;

export const toCandidateMarkets = (events: Event[]): CandidateMarket[] => {
  const seen = new Set<string>();
  const candidates: CandidateMarket[] = [];

  events.forEach((event) => {
    const tags = getEventTagSlugs(event);
    const eventTitle = event.title ?? "Untitled event";

    event.markets?.forEach((market) => {
      if (!isActiveMarket(market)) return;
      if (seen.has(market.id)) return;

      const yesProb = getYesProbability(market);
      if (yesProb === null) return;

      const trendResult = getTrend(market);

      const candidate: CandidateMarket = {
        marketId: market.id,
        slug: market.slug ?? "",
        question: market.question ?? "Untitled market",
        endDateIso: market.endDate,
        yesProb,
        trend: trendResult.trend,
        deltaPp: trendResult.deltaPp,
        liquidityNum: toNumberOrNull(market.liquidityNum),
        volumeNum: toNumberOrNull(market.volumeNum),
        volume24hr: toNumberOrNull(market.volume24hr),
        tags,
        eventId: event.id,
        eventTitle,
        seriesSlug: event.seriesSlug,
      };

      seen.add(market.id);
      candidates.push(candidate);
    });
  });

  return candidates;
};
