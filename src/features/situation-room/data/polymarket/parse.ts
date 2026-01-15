import type { Market } from "./types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const parseJsonArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch {
      return [];
    }
  }
  return [];
};

const parseOutcomePrices = (value: unknown): number[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => Number(item)).filter((item) => Number.isFinite(item));
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as Array<string | number>;
      return parsed.map((item) => Number(item)).filter((item) => Number.isFinite(item));
    } catch {
      return [];
    }
  }
  return [];
};

export const getYesProbability = (market: Market): number | null => {
  const outcomes = parseJsonArray(market.outcomes);
  const prices = parseOutcomePrices(market.outcomePrices);
  if (!outcomes.length || !prices.length) return null;

  const yesIndex = outcomes.findIndex((outcome) => outcome.trim().toLowerCase() === "yes");
  if (yesIndex === -1) return null;
  const price = prices[yesIndex];
  if (!Number.isFinite(price)) return null;

  return clamp(price * 100, 0, 100);
};

export const getTrend = (
  market: Market
): { trend: "up" | "down" | "stable"; deltaPp: number | null } => {
  const delta =
    typeof market.oneDayPriceChange === "number"
      ? market.oneDayPriceChange
      : typeof market.oneHourPriceChange === "number"
      ? market.oneHourPriceChange
      : null;

  if (delta === null || !Number.isFinite(delta)) {
    return { trend: "stable", deltaPp: null };
  }

  const deltaPp = delta * 100;
  if (deltaPp >= 1) return { trend: "up", deltaPp };
  if (deltaPp <= -1) return { trend: "down", deltaPp };
  return { trend: "stable", deltaPp };
};

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

export const runPolymarketParseSanityChecks = () => {
  const sampleMarket: Market = {
    id: "sample-1",
    outcomes: "[\"Yes\", \"No\"]",
    outcomePrices: "[\"0.08\", \"0.92\"]",
    oneDayPriceChange: 0.012,
  };

  assert(getYesProbability(sampleMarket) === 8, "Expected Yes probability of 8");
  const trend = getTrend(sampleMarket);
  assert(trend.trend === "up", "Expected trend to be up");
  assert(trend.deltaPp === 1.2, "Expected deltaPp of 1.2");
};
