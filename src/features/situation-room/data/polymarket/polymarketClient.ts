import type { PredictionMarket } from "../../domain/types";
import { polymarketWatchlist } from "./watchlist";

const POLYMARKET_BASE_URL = "https://gamma-api.polymarket.com";
const lastProbabilityBySlug = new Map<string, number>();

type GammaMarket = {
  id: string;
  slug?: string;
  question?: string;
  title?: string;
  endDate?: string;
  category?: string;
  liquidity?: number;
  volume?: number;
  outcomes?: string[] | string;
  outcomePrices?: number[] | string[];
  active?: boolean;
  closed?: boolean;
};

const parseOutcomes = (outcomes: GammaMarket["outcomes"]): string[] => {
  if (!outcomes) return [];
  if (Array.isArray(outcomes)) return outcomes;
  try {
    const parsed = JSON.parse(outcomes);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseOutcomePrices = (prices: GammaMarket["outcomePrices"]): number[] => {
  if (!prices) return [];
  if (Array.isArray(prices)) {
    return prices.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  }
  if (typeof prices === "string") {
    try {
      const parsed = JSON.parse(prices) as Array<string | number>;
      return parsed.map((value) => Number(value)).filter((value) => Number.isFinite(value));
    } catch {
      return [];
    }
  }
  return [];
};

const toProbability = (outcomes: string[], prices: number[]): number => {
  if (!prices.length) return 0;
  const yesIndex = outcomes.findIndex((outcome) => outcome.toLowerCase() === "yes");
  const price = yesIndex >= 0 ? prices[yesIndex] : prices[0];
  return Math.max(0, Math.min(100, Math.round(price * 100)));
};

const toTimeframe = (endDate?: string): string | undefined => {
  if (!endDate) return undefined;
  const year = new Date(endDate).getUTCFullYear();
  return Number.isNaN(year) ? undefined : String(year);
};

const toPredictionMarket = (market: GammaMarket, fallbackSlug?: string): PredictionMarket => {
  const outcomes = parseOutcomes(market.outcomes);
  const outcomePrices = parseOutcomePrices(market.outcomePrices);
  const probability = toProbability(outcomes, outcomePrices);
  const slugKey = market.slug ?? fallbackSlug;
  const previous = slugKey ? lastProbabilityBySlug.get(slugKey) : undefined;
  let trend: PredictionMarket["trend"] = "stable";
  if (previous !== undefined) {
    const delta = probability - previous;
    if (delta >= 1) trend = "up";
    if (delta <= -1) trend = "down";
  }
  if (slugKey) {
    lastProbabilityBySlug.set(slugKey, probability);
  }

  return {
    question: market.question || market.title || "Prediction market",
    probability,
    trend,
    category: market.category || "general",
    timeframe: toTimeframe(market.endDate),
    url: market.slug ? `https://polymarket.com/market/${market.slug}` : undefined,
  };
};

export const polymarketClient = {
  async getMarketsBySlug(slug: string): Promise<PredictionMarket[]> {
    const res = await fetch(`${POLYMARKET_BASE_URL}/markets?slug=${encodeURIComponent(slug)}`);
    if (!res.ok) {
      throw new Error(`Failed to load Polymarket slug ${slug}`);
    }
    const data = (await res.json()) as GammaMarket[];
    return data.map((market) => toPredictionMarket(market, slug));
  },

  async getWatchlistMarkets(): Promise<PredictionMarket[]> {
    const results = await Promise.all(
      polymarketWatchlist.map((item) => polymarketClient.getMarketsBySlug(item.slug))
    );
    return results.flat();
  },
};

export const getPolymarketPredictions = async (): Promise<PredictionMarket[]> => {
  return polymarketClient.getWatchlistMarkets();
};
