'use client';
import React, { useState } from 'react';
import { X, MapPin, Clock, Shield, BookOpen, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { situationService } from '../services/situationService';
import type { HistoricalContext, NewsCategory, NewsItem, ThreatLevel } from '../domain/types';

type NewsModalProps = {
  news: NewsItem | null;
  onClose: () => void;
};

export default function NewsModal({ news, onClose }: NewsModalProps) {
  const [historicalContext, setHistoricalContext] = useState<HistoricalContext | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [showContext, setShowContext] = useState(false);

  if (!news) return null;

  const inlineHistoricalContext =
    typeof news.historicalContext === 'string' ? news.historicalContext.trim() : '';
  const hasInlineContext = inlineHistoricalContext.length > 0;
  const titleLabel = news.title ?? 'Untitled';
  const summaryLabel = news.summary ?? 'Summary unavailable.';

  const fetchHistoricalContext = async () => {
    if (hasInlineContext) {
      setShowContext(!showContext);
      return;
    }

    if (historicalContext) {
      setShowContext(!showContext);
      return;
    }

    setIsLoadingContext(true);
    setShowContext(true);

    try {
      const response = await situationService.getHistoricalContext(news.id);
      setHistoricalContext(response);
    } catch (error) {
      console.error('Failed to fetch historical context:', error);
    } finally {
      setIsLoadingContext(false);
    }
  };

  const getThreatColor = (level?: ThreatLevel | null) => {
    switch (level?.toLowerCase()) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500';
      case 'moderate': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500';
      default: return 'bg-green-500/20 text-green-400 border-green-500';
    }
  };

  const getThreatBgColor = (level?: ThreatLevel | null) => {
    switch (level?.toLowerCase()) {
      case 'critical': return 'from-red-900/20';
      case 'high': return 'from-orange-900/20';
      case 'moderate': return 'from-yellow-900/20';
      default: return 'from-green-900/20';
    }
  };

  const getCategoryIcon = (category?: NewsCategory | null) => {
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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-b ${getThreatBgColor(news.threat_level)} to-[#0a0a0a] border border-cyan-900/30 rounded-lg shadow-2xl my-8`}
        >
          {/* Scan line effect */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.02]" 
               style={{
                 backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
               }} 
          />

          {/* Header */}
          <div className="sticky top-0 z-10 p-4 border-b border-cyan-900/30 bg-[#0a0a0a]/90 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{getCategoryIcon(news.category)}</div>
                <div>
                  <span className={`text-[10px] px-2 py-0.5 rounded border ${getThreatColor(news.threat_level)} uppercase tracking-wider font-bold`}>
                    {news.threat_level} THREAT
                  </span>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                    <span className="uppercase tracking-wider">{news.category}</span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-white leading-tight">
              {titleLabel}
            </h2>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-cyan-400">
                <MapPin className="w-4 h-4" />
                <span>{news.region}</span>
              </div>
              {news.country && (
                <>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">{news.country}</span>
                </>
              )}
            </div>

            <div className="bg-[#111]/50 border border-cyan-900/20 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] text-cyan-400 tracking-wider font-bold">INTELLIGENCE SUMMARY</span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                {summaryLabel}
              </p>
            </div>

            {/* Historical Context Button */}
            <div className="border border-amber-900/30 rounded overflow-hidden">
              <button
                onClick={fetchHistoricalContext}
                className="w-full flex items-center justify-between p-3 bg-amber-900/10 hover:bg-amber-900/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-amber-400">Historical Context</span>
                </div>
                {isLoadingContext ? (
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                ) : showContext ? (
                  <ChevronUp className="w-4 h-4 text-amber-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-amber-400" />
                )}
              </button>

              <AnimatePresence>
                {showContext && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-[#111]/30 border-t border-amber-900/20">
                      {isLoadingContext ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-3">
                          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                          <span className="text-[10px] text-amber-600 tracking-wider">ANALYZING HISTORICAL DATA...</span>
                        </div>
                      ) : hasInlineContext ? (
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                          {inlineHistoricalContext}
                        </p>
                      ) : historicalContext ? (
                        <div className="space-y-4">
                          {(() => {
                            const keyDates = historicalContext.key_dates ?? [];
                            const keyFigures = historicalContext.key_figures ?? [];
                            return (
                              <>
                          {historicalContext.title && (
                            <h3 className="text-sm font-bold text-amber-400">{historicalContext.title}</h3>
                          )}
                          
                          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                            {historicalContext.context}
                          </p>

                          {keyDates.length > 0 && (
                            <div className="mt-4">
                              <span className="text-[10px] text-amber-600 tracking-wider font-bold block mb-2">KEY DATES</span>
                              <div className="space-y-2">
                                {keyDates.map((item, idx) => (
                                  <div key={idx} className="flex gap-3 text-xs">
                                    <span className="text-amber-400 font-mono font-bold min-w-[60px]">{item.year}</span>
                                    <span className="text-gray-400">{item.event}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {keyFigures.length > 0 && (
                            <div className="mt-4">
                              <span className="text-[10px] text-amber-600 tracking-wider font-bold block mb-2">KEY FIGURES</span>
                              <div className="flex flex-wrap gap-2">
                                {keyFigures.map((figure, idx) => (
                                  <span key={idx} className="text-xs px-2 py-1 bg-amber-900/20 border border-amber-900/30 rounded text-amber-300">
                                    {figure}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                              </>
                            );
                          })()}
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {news.sources.length > 0 && (
              <div className="bg-[#111]/40 border border-cyan-900/20 rounded p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] text-cyan-400 tracking-wider font-bold">SOURCES</span>
                </div>
                <ul className="space-y-2 text-xs text-cyan-200">
                  {news.sources.map((source, idx) => (
                    <li key={`${source}-${idx}`}>
                      <a
                        href={source}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-dotted hover:text-cyan-100"
                      >
                        {source}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Coordinates */}
            {(Number.isFinite(news.lat) && Number.isFinite(news.lng)) && (
              <div className="flex items-center gap-4 text-[10px] text-gray-500 font-mono">
                <span>LAT: {news.lat?.toFixed(4)}°</span>
                <span>LNG: {news.lng?.toFixed(4)}°</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-cyan-900/30 bg-[#0a0a0a]/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-gray-500">
                <Clock className="w-3 h-3" />
                <span className="tracking-wider">INTEL REFRESHED: {new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC</span>
              </div>
            </div>
          </div>

          {/* Decorative corners */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500/30 pointer-events-none" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500/30 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500/30 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500/30 pointer-events-none" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
