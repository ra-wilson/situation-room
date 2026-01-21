export type CandidateMarket = {
  marketId: string;
  slug: string;
  question: string;
  endDateIso?: string;
  yesProb: number;
  trend: "up" | "down" | "stable";
  deltaPp: number | null;
  liquidityNum: number | null;
  volumeNum: number | null;
  volume24hr: number | null;
  tags: string[];
  eventId: string;
  eventTitle: string;
  seriesSlug?: string;
};
