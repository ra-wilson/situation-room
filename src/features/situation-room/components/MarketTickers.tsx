'use client';
import React, { useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { situationService } from '../services/situationService';
import type { MarketTicker } from '../domain/types';
import { useSnapshotFetch } from '../hooks/useSnapshotFetch';
import { useRenderGuard } from '../hooks/useRenderGuard';

export default function MarketTickers() {
  console.count('MarketsPanel render');
  const { tripped } = useRenderGuard('MarketsPanel');
  const fetcher = useCallback(async () => situationService.getMarketTickers(), []);
  const { data: markets, isLoading, error, fetchSnapshot, cancel } = useSnapshotFetch<MarketTicker[]>(
    async (signal) => {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      return fetcher();
    },
    { enabled: !tripped }
  );

  useEffect(() => {
    // Intentionally fetch once on mount. Freshness is managed server-side (cron + revalidate).
    if (!tripped) {
      void fetchSnapshot();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tripped) {
      cancel();
    }
  }, [tripped, cancel]);

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-3 h-3" />;
    if (change < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <div className="fixed top-16 left-0 right-0 z-30 bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-cyan-900/20">
      <div className="overflow-hidden">
        {tripped ? (
          <div className="flex items-center justify-center py-2 text-[10px] text-red-400 tracking-wider">
            LIVE DATA TEMPORARILY UNAVAILABLE
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-2 text-[10px] text-cyan-600 tracking-wider">
            LOADING MARKETS...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-2 text-[10px] text-red-400 tracking-wider">
            FAILED TO LOAD MARKETS
          </div>
        ) : markets && markets.length > 0 ? (
          <div className="flex animate-scroll-left">
            {[...markets, ...markets].map((market, index) => (
              <div
                key={`${market.symbol}-${index}`}
                className="flex items-center gap-3 px-6 py-2 border-r border-cyan-900/20 whitespace-nowrap"
              >
                <span className="text-[10px] text-cyan-600 font-bold tracking-wider">{market.symbol}</span>
                <span className="text-xs text-white font-medium">{market.value}</span>
                <div className={`flex items-center gap-1 ${getChangeColor(market.change)}`}>
                  {getChangeIcon(market.change)}
                  <span className="text-[10px] font-bold">
                    {market.change > 0 ? '+' : ''}{market.change?.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-2 text-[10px] text-gray-500 tracking-wider">
            NO MARKET DATA
          </div>
        )}
      </div>
    </div>
  );
}
