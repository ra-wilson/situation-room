'use client';
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { situationService } from '../services/situationService';
import type { MarketTicker } from '../domain/types';

export default function MarketTickers() {
  const [markets, setMarkets] = useState<MarketTicker[]>([]);

  const fetchMarketData = async () => {
    try {
      const data = await situationService.getMarketTickers();
      setMarkets(data);
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchMarketData();
    }, 0);
    const interval = setInterval(() => {
      void fetchMarketData();
    }, 60000); // Refresh every minute
    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, []);

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
        <div className="flex animate-scroll-left">
          {[...markets, ...markets].map((market, index) => (
            <div 
              key={index}
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
      </div>
    </div>
  );
}
