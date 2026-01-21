export type PolymarketWatchlistItem = {
  id: string;
  slug: string;
  category: string;
  timeframe: string;
  countries?: string[];
  theatres?: string[];
};

export const polymarketWatchlist: PolymarketWatchlistItem[] = [
  {
    id: "pm-iran-regime-fall-jan-2026",
    slug: "will-the-iranian-regime-fall-by-january-31",
    category: "leadership",
    timeframe: "Jan 2026",
    countries: ["Iran"],
    theatres: ["Middle East"],
  },
  {
    id: "pm-iran-regime-fall-2026",
    slug: "will-the-iranian-regime-fall-by-the-end-of-2026",
    category: "leadership",
    timeframe: "2026",
    countries: ["Iran"],
    theatres: ["Middle East"],
  },
  {
    id: "pm-us-next-strikes-2026",
    slug: "next-country-us-strikes",
    category: "conflict",
    timeframe: "2026",
    countries: ["United States", "Multiple"],
    theatres: ["Global"],
  },
  {
    id: "pm-us-acquire-greenland-2026",
    slug: "will-the-us-acquire-part-of-greenland-in-2026",
    category: "diplomacy",
    timeframe: "2026",
    countries: ["United States", "Denmark/Greenland"],
    theatres: ["Arctic"],
  },
];
