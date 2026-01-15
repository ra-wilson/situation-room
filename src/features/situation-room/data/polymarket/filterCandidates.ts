import type { CandidateMarket } from "./candidateTypes";

type FilterOptions = {
  minLiquidity?: number;
  minVolume?: number;
  requireGeopoliticsTag?: boolean;
};

const hasRequiredVolume = (candidate: CandidateMarket, minVolume: number) => {
  const volumeNum = candidate.volumeNum ?? 0;
  const volume24hr = candidate.volume24hr ?? 0;
  return volumeNum >= minVolume || volume24hr >= 10_000;
};

export const filterCandidates = (
  candidates: CandidateMarket[],
  options: FilterOptions = {}
): CandidateMarket[] => {
  const minLiquidity = options.minLiquidity ?? 10_000;
  const minVolume = options.minVolume ?? 250_000;
  const requireGeopoliticsTag = options.requireGeopoliticsTag ?? false;

  return candidates.filter((candidate) => {
    if (!Number.isFinite(candidate.yesProb)) return false;
    if (candidate.yesProb <= 0 || candidate.yesProb >= 100) return false;
    if (!candidate.slug.trim()) return false;
    if (!candidate.question.trim()) return false;
    if ((candidate.liquidityNum ?? 0) < minLiquidity) return false;
    if (!hasRequiredVolume(candidate, minVolume)) return false;
    if (requireGeopoliticsTag && !candidate.tags.includes("geopolitics")) return false;
    return true;
  });
};
