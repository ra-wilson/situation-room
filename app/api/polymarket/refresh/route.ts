import { NextResponse } from "next/server";
import type { PredictionMarket } from "@/src/features/situation-room/domain/types";
import { getPolymarketPredictions } from "@/src/features/situation-room/data/polymarket/polymarketClient";
import { getDiscoverResults } from "@/src/features/situation-room/data/polymarket/discoverService";
import type { CandidateMarket } from "@/src/features/situation-room/data/polymarket/candidateTypes";
import { prisma } from "@/src/lib/db";
import { buildCronUnauthorized, isCronAuthorized } from "@/src/lib/cron-auth";
import { runWithCronGuard } from "@/src/lib/cron-guard";

export const runtime = "nodejs";

const POLYMARKET_GUARD_KEY = "polymarket-refresh";
const POLYMARKET_GUARD_TTL_MS = 5 * 60 * 1000;

const MIN_DISCOVERY_MARKETS = 6;

type PolymarketSnapshotPayload = {
  data: PredictionMarket[];
  meta: {
    source: "discovery" | "watchlist";
    generatedAt: string;
    missingCount: number;
  };
};

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

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return buildCronUnauthorized();
  }

  const guarded = await runWithCronGuard(
    POLYMARKET_GUARD_KEY,
    POLYMARKET_GUARD_TTL_MS,
    async () => {
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

      const payload: PolymarketSnapshotPayload = {
        data: predictions,
        meta: { source, generatedAt, missingCount },
      };

      await prisma.polymarketSnapshot.create({
        data: { payload },
      });

      return payload;
    },
  );

  if (guarded.skipped) {
    return NextResponse.json(
      { error: "Refresh already running" },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, generatedAt: guarded.result.meta.generatedAt });
}
