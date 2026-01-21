'use client';
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PredictionMarket } from '../domain/types';

export default function PolymarketOdds() {
  const [odds, setOdds] = useState<PredictionMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOdds();
  }, []);

  const fetchOdds = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/polymarket");
      if (!res.ok) {
        throw new Error("Failed to load polymarket");
      }
      const data = (await res.json()) as PredictionMarket[];
      setOdds(data);
    } catch (error) {
      console.error('Failed to fetch odds:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendIcon = (trend) => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-green-400" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3 text-red-400" />;
    return <div className="w-3 h-0.5 bg-gray-500 rounded" />;
  };

  const getProbabilityColor = (prob) => {
    if (prob >= 70) return 'text-green-400';
    if (prob >= 40) return 'text-yellow-400';
    if (prob >= 20) return 'text-orange-400';
    return 'text-red-400';
  };

  const getCategoryColor = (category) => {
    switch (category?.toLowerCase()) {
      case 'conflict': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'election': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'economy': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'diplomacy': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'leadership': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0d0d0d]/80 backdrop-blur-sm border border-cyan-900/30 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-cyan-900/30 bg-[#0a0a0a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold tracking-wider text-cyan-400">PREDICTION MARKETS</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchOdds}
            disabled={isLoading}
            className="h-6 px-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[10px] text-gray-500 tracking-wider">AI ESTIMATED ODDS</span>
        </div>
      </div>

      {/* Odds List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] text-amber-600 tracking-wider">CALCULATING PROBABILITIES...</span>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {odds.map((item, index) => (
              <div
                key={index}
                className="p-3 bg-[#111]/50 border border-cyan-900/20 rounded hover:border-amber-500/30 transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getCategoryColor(item.category)} uppercase tracking-wider`}>
                    {item.category}
                  </span>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(item.trend)}
                  </div>
                </div>
                
                <p className="text-[11px] text-gray-300 leading-tight mb-3">
                  {item.question}
                </p>
                
                {/* Probability bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">Probability</span>
                    <span className={`text-sm font-bold ${getProbabilityColor(item.probability)}`}>
                      {item.probability.toFixed(2)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.probability >= 70 ? 'bg-green-500' :
                        item.probability >= 40 ? 'bg-yellow-500' :
                        item.probability >= 20 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${item.probability}%` }}
                    />
                  </div>
                </div>
                
                {item.timeframe && (
                  <p className="text-[9px] text-gray-600 mt-2">{item.timeframe}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
