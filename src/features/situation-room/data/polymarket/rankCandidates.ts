import type { CandidateMarket } from "./candidateTypes";

const MONTHS_6_MS = 1000 * 60 * 60 * 24 * 30 * 6;

const isWithinSixMonths = (endDateIso?: string): boolean => {
  if (!endDateIso) return false;
  const endTime = new Date(endDateIso).getTime();
  if (Number.isNaN(endTime)) return false;
  const now = Date.now();
  return endTime > now && endTime - now <= MONTHS_6_MS;
};

const scoreCandidate = (candidate: CandidateMarket): number => {
  const volume24hr = candidate.volume24hr ?? 0;
  const liquidityNum = candidate.liquidityNum ?? 0;

  let score = Math.log1p(volume24hr) * 2 + Math.log1p(liquidityNum) * 1.5;
  if (candidate.seriesSlug) score += 1;
  if (isWithinSixMonths(candidate.endDateIso)) score += 1;
  return score;
};

export const rankCandidates = (candidates: CandidateMarket[]): CandidateMarket[] => {
  return [...candidates].sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
};
