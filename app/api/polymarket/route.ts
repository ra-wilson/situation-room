import { NextResponse } from "next/server";
import type { PredictionMarket } from "@/src/features/situation-room/domain/types";
import { getPolymarketPredictions } from "@/src/features/situation-room/data/polymarket/polymarketClient";
import { getDiscoverResults } from "@/src/features/situation-room/data/polymarket/discoverService";
import type { CandidateMarket } from "@/src/features/situation-room/data/polymarket/candidateTypes";

const CACHE_TTL_MS = 60_000;
const MIN_DISCOVERY_MARKETS = 6;

let cachedPredictions:
  | {
      expiresAt: number;
      data: PredictionMarket[];
      source: "discovery" | "watchlist";
      generatedAt: string;
      missingCount: number;
    }
  | null = null;

const buildHeaders = (meta: { source: string; generatedAt: string; missingCount: number }) =>
  new Headers({
    "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=30",
    "X-Polymarket-Source": meta.source,
    "X-Polymarket-Generated-At": meta.generatedAt,
    "X-Polymarket-Missing-Count": String(meta.missingCount),
  });

const toTimeframe = (endDateIso?: string): string | undefined => {
  if (!endDateIso) return undefined;
  const year = new Date(endDateIso).getUTCFullYear();
  return Number.isNaN(year) ? undefined : String(year);
};

const toCategory = (candidate: CandidateMarket): string => {
  if (candidate.tags.includes("geopolitics")) return "geopolitics";
  return candidate.tags[0] ?? "geopolitics";
};

const toPredictionMarket = (candidate: CandidateMarket): PredictionMarket => ({
  question: candidate.question,
  probability: candidate.yesProb,
  trend: candidate.trend,
  category: toCategory(candidate),
  timeframe: toTimeframe(candidate.endDateIso),
  slug: candidate.slug,
  url: candidate.slug ? `https://polymarket.com/market/${candidate.slug}` : undefined,
});

export async function GET() {
  const now = Date.now();
  if (cachedPredictions && now < cachedPredictions.expiresAt) {
    return NextResponse.json(cachedPredictions.data, {
      headers: buildHeaders(cachedPredictions),
    });
  }

  try {
    const discovery = await getDiscoverResults();
    let predictions: PredictionMarket[] = [];
    let source: "discovery" | "watchlist" = "watchlist";

    if (discovery.candidates.length >= MIN_DISCOVERY_MARKETS) {
      predictions = discovery.candidates.slice(0, 8).map(toPredictionMarket);
      source = "discovery";
    } else {
      predictions = await getPolymarketPredictions();
    }

    const generatedAt = new Date().toISOString();
    const missingCount = Math.max(0, 8 - predictions.length);

    cachedPredictions = {
      data: predictions,
      expiresAt: now + CACHE_TTL_MS,
      source,
      generatedAt,
      missingCount,
    };

    return NextResponse.json(predictions, {
      headers: buildHeaders({ source, generatedAt, missingCount }),
    });
  } catch (error) {
    if (cachedPredictions) {
      return NextResponse.json(cachedPredictions.data, {
        headers: buildHeaders(cachedPredictions),
      });
    }
    const generatedAt = new Date().toISOString();
    return NextResponse.json([], {
      headers: buildHeaders({ source: "watchlist", generatedAt, missingCount: 8 }),
    });
  }
}
