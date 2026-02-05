'use client';
import React, { useEffect } from 'react';
import { MapPin, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { situationService } from '../services/situationService';
import type { NewsCategory, NewsItem, ThreatLevel } from '../domain/types';

type NewsFeedProps = {
  onSelectNews: (news: NewsItem) => void;
  newsData: NewsItem[];
  setNewsData: React.Dispatch<React.SetStateAction<NewsItem[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function NewsFeed({ onSelectNews, newsData, setNewsData, isLoading, setIsLoading }: NewsFeedProps) {
  
  useEffect(() => {
    fetchNews();
  }, []);

  const toNumber = (value: unknown): number | null => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const normalizeThreatLevel = (value: unknown): ThreatLevel => {
    if (typeof value !== 'string') return 'low';
    const normalized = value.toLowerCase();
    if (normalized === 'medium') return 'moderate';
    if (
      normalized === 'low' ||
      normalized === 'moderate' ||
      normalized === 'high' ||
      normalized === 'critical'
    ) {
      return normalized;
    }
    return 'low';
  };

  const normalizeCategory = (value: unknown): NewsCategory => {
    if (typeof value !== 'string') return 'conflict';
    const normalized = value.toLowerCase();
    if (
      normalized === 'conflict' ||
      normalized === 'election' ||
      normalized === 'economy' ||
      normalized === 'diplomacy' ||
      normalized === 'leadership' ||
      normalized === 'nuclear' ||
      normalized === 'cyber' ||
      normalized === 'political'
    ) {
      return normalized;
    }
    return 'conflict';
  };

  const formatRegionLabel = (value: string): string => {
    const normalized = value.trim().toLowerCase();
    const replacements: Record<string, string> = {
      americas: 'North America',
      'north-america': 'North America',
      'south-america': 'South America',
      europe: 'Europe',
      'asia-pacific': 'Asia-Pacific',
      'south-asia': 'South Asia',
      'middle-east': 'Middle East',
    };

    if (replacements[normalized]) return replacements[normalized];

    return value
      .split(' ')
      .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
      .join(' ');
  };

  const normalizeNewsItem = (item: unknown, index: number): NewsItem => {
    const raw = item as Record<string, unknown>;
    const lat = toNumber(raw.lat ?? raw.latitude);
    const lng = toNumber(raw.lng ?? raw.longitude);
    const threatLevel = normalizeThreatLevel(raw.threat_level ?? raw.threatLevel ?? raw.severity);
    const category = normalizeCategory(raw.category);
    const countries = Array.isArray(raw.countries)
      ? raw.countries.filter((value): value is string => typeof value === 'string')
      : [];
    const theatres = Array.isArray(raw.theatres)
      ? raw.theatres.filter((value): value is string => typeof value === 'string')
      : [];
    const regionLabel =
      typeof raw.region === 'string'
        ? formatRegionLabel(raw.region)
        : typeof raw.regionName === 'string'
        ? formatRegionLabel(raw.regionName)
        : theatres[0]
        ? formatRegionLabel(theatres[0])
        : countries[0] ?? 'Unknown';

    return {
      id: typeof raw.id === 'string' ? raw.id : `news-${index}`,
      title: typeof raw.title === 'string' ? raw.title : null,
      summary: typeof raw.summary === 'string' ? raw.summary : null,
      historicalContext:
        typeof raw.historicalContext === 'string' ? raw.historicalContext : null,
      sources: Array.isArray(raw.sources)
        ? raw.sources.filter((source): source is string => typeof source === 'string')
        : [],
      threat_level: threatLevel,
      region: regionLabel,
      country: countries[0],
      lat: lat ?? Number.NaN,
      lng: lng ?? Number.NaN,
      category: category,
      timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : undefined,
    };
  };

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const news = await situationService.getNews();
      const normalized = news.map((item, index) => normalizeNewsItem(item, index));
      setNewsData(normalized);
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getThreatColor = (level?: ThreatLevel) => {
    switch (level?.toLowerCase()) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'moderate': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default: return 'bg-green-500/20 text-green-400 border-green-500/50';
    }
  };

  const getCategoryIcon = (category?: NewsCategory) => {
    switch (category?.toLowerCase()) {
      case 'conflict': return '⚔️';
      case 'nuclear': return '☢️';
      case 'cyber': return '💻';
      case 'economy': return '💰';
      case 'diplomacy': return '🤝';
      default: return '🌐';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0d0d0d]/80 backdrop-blur-sm border border-cyan-900/30 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-cyan-900/30 bg-[#0a0a0a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold tracking-wider text-cyan-400">INTELLIGENCE FEED</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchNews}
            disabled={isLoading}
            className="h-6 px-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-gray-500 tracking-wider">LIVE • AI CURATED</span>
        </div>
      </div>

      {/* News Items */}
      <div className="flex-1 overflow-y-auto custom-scrollbar news-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] text-cyan-600 tracking-wider">ANALYZING GLOBAL INTEL...</span>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {newsData.map((news, index) => (
              <button
                key={news.id}
                onClick={() => onSelectNews(news)}
                className="w-full text-left p-3 bg-[#111]/50 border border-cyan-900/20 rounded hover:border-cyan-500/50 hover:bg-cyan-900/10 transition-all group"
              >
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-sm">{getCategoryIcon(news.category)}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getThreatColor(news.threat_level)} uppercase tracking-wider font-bold`}>
                    {news.threat_level}
                  </span>
                </div>
                
                <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors leading-tight mb-2">
                  {news.title ?? 'Untitled'}
                </h3>
                
                <div className="flex items-center gap-3 text-[10px] text-gray-500">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" />
                    <span>{news.region}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
