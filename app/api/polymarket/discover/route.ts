import { NextResponse } from "next/server";
import { GEO_SEED_TERMS } from "@/src/features/situation-room/data/polymarket/seedTerms";
import { getDiscoverResults } from "@/src/features/situation-room/data/polymarket/discoverService";
import type { CandidateMarket } from "@/src/features/situation-room/data/polymarket/candidateTypes";

export const runtime = "nodejs";

const CONCURRENCY_LIMIT = 4;

type DiscoverResponse = {
  generatedAt: string;
  seedTermsUsed: number;
  concurrency: number;
  totalEventsFetched: number;
  totalCandidatesRaw: number;
  totalCandidatesDeduped: number;
  totalCandidatesReturned: number;
  candidates: CandidateMarket[];
  forcedRefresh: boolean;
  warning?: string;
};

const buildResponse = (data: {
  candidates: CandidateMarket[];
  totalEventsFetched: number;
  totalCandidatesRaw: number;
  totalCandidatesDeduped: number;
  forcedRefresh: boolean;
  warning?: string;
}): DiscoverResponse => ({
  generatedAt: new Date().toISOString(),
  seedTermsUsed: GEO_SEED_TERMS.length,
  concurrency: CONCURRENCY_LIMIT,
  totalEventsFetched: data.totalEventsFetched,
  totalCandidatesRaw: data.totalCandidatesRaw,
  totalCandidatesDeduped: data.totalCandidatesDeduped,
  totalCandidatesReturned: data.candidates.length,
  candidates: data.candidates,
  forcedRefresh: data.forcedRefresh,
  warning: data.warning,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const refresh = searchParams.get("refresh") === "1";

  if (refresh) {
    // eslint-disable-next-line no-console
    console.info("[polymarket/discover] forced refresh requested");
  }

  const result = await getDiscoverResults({ forceRefresh: refresh });
  const response = buildResponse({
    candidates: result.candidates,
    totalEventsFetched: result.totalEventsFetched,
    totalCandidatesRaw: result.totalCandidatesRaw,
    totalCandidatesDeduped: result.totalCandidatesDeduped,
    forcedRefresh: refresh,
    warning: result.warning,
  });
  return NextResponse.json(response);
}
