import type { HistoricalContext, MarketTicker, NewsItem, PredictionMarket } from "../../domain/types";

const mockNews: NewsItem[] = [
  {
    id: "news-1",
    headline: "Baltic airspace incident raises NATO alert",
    summary:
      "Unscheduled military aircraft activity near Baltic borders triggered heightened monitoring. Officials say air patrols remain defensive and no incursions occurred.",
    threat_level: "moderate",
    region: "Baltic Sea",
    country: "Lithuania",
    lat: 55.1694,
    lng: 23.8813,
    category: "conflict",
    timestamp: new Date().toISOString(),
  },
  {
    id: "news-2",
    headline: "Red Sea shipping reroutes after drone strikes",
    summary:
      "Commercial carriers announce temporary diversion around the Red Sea following a series of drone attacks near key transit lanes. Insurance premiums are climbing.",
    threat_level: "high",
    region: "Red Sea",
    country: "Yemen",
    lat: 15.5527,
    lng: 48.5164,
    category: "conflict",
    timestamp: new Date().toISOString(),
  },
  {
    id: "news-3",
    headline: "Central bank signals extended rate hold",
    summary:
      "Policymakers indicated rates will stay elevated as inflation remains sticky. Markets recalibrated expectations for cuts later this year.",
    threat_level: "low",
    region: "North America",
    country: "United States",
    lat: 38.9072,
    lng: -77.0369,
    category: "economy",
    timestamp: new Date().toISOString(),
  },
  {
    id: "news-4",
    headline: "West Africa election runoff set for next month",
    summary:
      "A tightly contested runoff is scheduled after no candidate secured a majority. Observers report high turnout and a calm voting process.",
    threat_level: "moderate",
    region: "West Africa",
    country: "Ghana",
    lat: 5.6037,
    lng: -0.187,
    category: "election",
    timestamp: new Date().toISOString(),
  },
  {
    id: "news-5",
    headline: "Backchannel talks resume on regional ceasefire",
    summary:
      "Diplomats confirmed renewed talks aimed at restoring a fragile ceasefire. Negotiators are discussing prisoner exchanges and aid corridors.",
    threat_level: "high",
    region: "Levant",
    country: "Israel",
    lat: 31.7683,
    lng: 35.2137,
    category: "diplomacy",
    timestamp: new Date().toISOString(),
  },
  {
    id: "news-6",
    headline: "Cyber unit claims disruption of power grid",
    summary:
      "Authorities are investigating a claim of cyber intrusion targeting grid operators. Contingency protocols were activated as a precaution.",
    threat_level: "moderate",
    region: "Eastern Europe",
    country: "Ukraine",
    lat: 50.4501,
    lng: 30.5234,
    category: "cyber",
    timestamp: new Date().toISOString(),
  },
  {
    id: "news-7",
    headline: "Asian summit signals cautious trade thaw",
    summary:
      "Leaders signaled progress on reopening trade channels while maintaining strategic export controls. Markets reacted cautiously.",
    threat_level: "low",
    region: "East Asia",
    country: "Japan",
    lat: 35.6762,
    lng: 139.6503,
    category: "economy",
    timestamp: new Date().toISOString(),
  },
  {
    id: "news-8",
    headline: "Rocket test prompts regional air defense alert",
    summary:
      "A ballistic missile test triggered air defense alerts across neighboring states. Officials condemned the launch and called for restraint.",
    threat_level: "critical",
    region: "Korean Peninsula",
    country: "North Korea",
    lat: 39.0392,
    lng: 125.7625,
    category: "nuclear",
    timestamp: new Date().toISOString(),
  },
];

const mockMarkets: MarketTicker[] = [
  { symbol: "XAU", name: "Gold", value: "$2,634.50", change: 0.42 },
  { symbol: "XAG", name: "Silver", value: "$31.24", change: -0.18 },
  { symbol: "US10Y", name: "10Y Yield", value: "4.42%", change: 0.03 },
  { symbol: "EUR", name: "EUR/USD", value: "1.0542", change: -0.21 },
  { symbol: "JPY", name: "USD/JPY", value: "154.32", change: 0.15 },
  { symbol: "GBP", name: "GBP/USD", value: "1.2634", change: -0.08 },
  { symbol: "BTC", name: "Bitcoin", value: "$104,230", change: 2.34 },
  { symbol: "SPX", name: "S&P 500", value: "6,012.45", change: 0.28 },
];

const mockPredictions: PredictionMarket[] = [
  {
    question: "Russia-Ukraine ceasefire by Q2 2025?",
    probability: 15,
    trend: "up",
    category: "conflict",
    timeframe: "Q2 2025",
  },
  {
    question: "US-China trade deal in 2025?",
    probability: 22,
    trend: "down",
    category: "economy",
    timeframe: "2025",
  },
  {
    question: "NATO expansion to include new member?",
    probability: 35,
    trend: "stable",
    category: "diplomacy",
    timeframe: "Late 2025",
  },
  {
    question: "Iran nuclear deal revival?",
    probability: 8,
    trend: "down",
    category: "diplomacy",
    timeframe: "2025",
  },
  {
    question: "Major cyber attack on Western infrastructure?",
    probability: 45,
    trend: "up",
    category: "conflict",
    timeframe: "Next 12 months",
  },
  {
    question: "Taiwan Strait military incident in 2025?",
    probability: 28,
    trend: "up",
    category: "conflict",
    timeframe: "2025",
  },
];

const mockHistoricalContexts: Record<string, HistoricalContext> = {
  "news-2": {
    title: "Red Sea Shipping Disruptions",
    context:
      "The Red Sea has long been a strategic chokepoint for global trade, connecting the Mediterranean to the Indian Ocean through the Suez Canal. Periodic conflicts in the region have repeatedly raised risks for commercial shipping, leading to higher insurance costs and rerouting decisions.\n\nRecent drone activity reflects a wider pattern of asymmetric tactics used to pressure maritime traffic and signal regional leverage. Past crises have shown that even brief disruptions can ripple into energy prices and freight rates.\n\nInternational naval coalitions have historically responded with convoy operations and patrols, while diplomatic backchannels seek de-escalation. The current situation mirrors earlier episodes where layered security and diplomacy were required to stabilize the corridor.",
    key_dates: [
      { year: "1956", event: "Suez Crisis leads to major shipping disruption." },
      { year: "1973", event: "Regional conflict triggers shipping risks and closures." },
      { year: "2023", event: "Drone and missile activity intensifies near sea lanes." },
    ],
    key_figures: ["Regional naval commanders", "Commercial shipping consortia", "International mediators"],
  },
};

export const getMockNews = (): NewsItem[] => mockNews;

export const getMockMarkets = (): MarketTicker[] => mockMarkets;

export const getMockPolymarkets = (): PredictionMarket[] => mockPredictions;

export const getMockContext = (newsId: string): HistoricalContext => {
  return (
    mockHistoricalContexts[newsId] || {
      title: "Historical Context Brief",
      context:
        "No specific historical dossier is available for this event. The region has experienced periodic tensions shaped by shifting alliances, economic pressures, and security dilemmas. Analysts recommend monitoring diplomatic statements and force posture changes for early indicators.",
    }
  );
};
