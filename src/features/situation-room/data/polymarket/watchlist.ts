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
    id: "pm-ukraine-ceasefire-2025",
    slug: "russia-ukraine-ceasefire-by-2025",
    category: "conflict",
    timeframe: "2025",
    countries: ["Ukraine", "Russia"],
    theatres: ["Eastern Europe"],
  },
  {
    id: "pm-gaza-ceasefire-2024",
    slug: "gaza-ceasefire-by-2024",
    category: "conflict",
    timeframe: "2024",
    countries: ["Israel", "Palestine"],
    theatres: ["Levant"],
  },
  {
    id: "pm-taiwan-incident-2025",
    slug: "taiwan-strait-military-incident-in-2025",
    category: "conflict",
    timeframe: "2025",
    countries: ["China", "Taiwan"],
    theatres: ["East Asia"],
  },
  {
    id: "pm-iran-nuclear-2025",
    slug: "iran-nuclear-deal-revival-by-2025",
    category: "diplomacy",
    timeframe: "2025",
    countries: ["Iran", "United States"],
    theatres: ["Middle East"],
  },
];
