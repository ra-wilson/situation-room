import type { Feature, FeatureCollection, Geometry } from "geojson";

export type ThreatLevel = "low" | "moderate" | "high" | "critical";

export type NewsCategory =
  | "conflict"
  | "election"
  | "economy"
  | "diplomacy"
  | "leadership"
  | "nuclear"
  | "cyber"
  | "political";

export type NewsItem = {
  id: string;
  headline: string;
  summary: string;
  threat_level: ThreatLevel;
  region: string;
  country?: string;
  lat: number;
  lng: number;
  category: NewsCategory;
  timestamp?: string; // ISO
};

export type CountryProperties = {
  // adapt to your geojson properties (common ones shown)
  ISO_A2?: string;
  ISO_A3?: string;
  ADMIN?: string;
  NAME?: string;

  // allow unknown properties without TS exploding
  [key: string]: unknown;
};

export type CountryFeature = Feature<Geometry, CountryProperties>;
export type CountriesGeoJSON = FeatureCollection<Geometry, CountryProperties>;

export type MarketTicker = {
  symbol: string;
  name: string;
  value: string;
  change: number; // percentage
};

export type PredictionMarket = {
  question: string;
  probability: number; // 0-100
  trend: "up" | "down" | "stable";
  category: string;
  timeframe?: string;
  slug?: string;
  url?: string;
};

export type HistoricalContext = {
  context: string;
  title?: string;
  key_dates?: { year: string; event: string }[];
  key_figures?: string[];
};

export type User = {
  id: string;
  full_name?: string;
  email?: string;
  role?: string;
};

export type AlertCategory =
  | "conflict"
  | "diplomacy"
  | "economy"
  | "nuclear"
  | "cyber"
  | "political"
  | "election"
  | "leadership";

export type Alert = {
  id: string;
  name: string;
  countries: string[];
  categories: AlertCategory[];
  threat_levels: ThreatLevel[];
  keywords: string[];
  is_active: boolean;
  email_notifications: boolean;
};

export type AlertFormData = Omit<Alert, "id">;
