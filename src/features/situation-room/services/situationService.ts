import type { HistoricalContext, MarketTicker, NewsItem, PredictionMarket } from "../domain/types";
import { getMockContext, getMockMarkets, getMockNews, getMockPolymarkets } from "../data/mock";

const USE_API = false; // flip later

export const situationService = {
  async getNews(): Promise<NewsItem[]> {
    if (!USE_API) return getMockNews();
    const res = await fetch("/api/news");
    if (!res.ok) throw new Error("Failed to load news");
    return res.json();
  },

  async getMarketTickers(): Promise<MarketTicker[]> {
    if (!USE_API) return getMockMarkets();
    const res = await fetch("/api/markets");
    if (!res.ok) throw new Error("Failed to load markets");
    return res.json();
  },

  async getPredictionMarkets(): Promise<PredictionMarket[]> {
    if (!USE_API) return getMockPolymarkets();
    const res = await fetch("/api/polymarket");
    if (!res.ok) throw new Error("Failed to load polymarket");
    return res.json();
  },

  async getHistoricalContext(newsId: string): Promise<HistoricalContext> {
    if (!USE_API) return getMockContext(newsId);
    const res = await fetch(`/api/context/${newsId}`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to generate context");
    return res.json();
  },
};
