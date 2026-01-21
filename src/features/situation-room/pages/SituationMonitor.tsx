'use client';
'use client';

import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlobeMap from '../components/GlobeMap';
import NewsFeed from '../components/NewsPanel';
import MarketTickers from '../components/MarketTickers';
import PolymarketOdds from '../components/PolymarketOdds';
import NewsModal from '../components/NewsModal';
import StatusBar from '../components/StatusBar';
import AlertsPanel from '../components/AlertsPanel';
import { authClient } from '../data/authClient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { NewsItem, User as SituationUser } from '../domain/types';

export default function SituationMonitor() {
  const [queryClient] = useState(() => new QueryClient());
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<SituationUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authenticated = await authClient.isAuthenticated();
      setIsAuthenticated(authenticated);
      if (authenticated) {
        const currentUser = await authClient.getCurrentUser();
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLogin = async () => {
    const loggedInUser = await authClient.login();
    setUser(loggedInUser);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await authClient.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  if (isCheckingAuth) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-cyan-400 text-sm tracking-wider">INITIALIZING SYSTEMS...</span>
          </div>
        </div>
      </QueryClientProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
          {/* Background grid */}
          <div className="pointer-events-none fixed inset-0 opacity-[0.02]"
               style={{
                 backgroundImage: 'linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)',
                 backgroundSize: '50px 50px'
               }}
          />
          
          {/* Scan lines */}
          <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]" 
               style={{
                 backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
               }} 
          />

          <div className="relative z-10 text-center p-8">
            <div className="mb-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-cyan-900/20 border-2 border-cyan-500/30 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-cyan-400 tracking-wider mb-2">SITUATION MONITOR</h1>
              <p className="text-cyan-600 text-sm tracking-widest">GEOPOLITICAL INTELLIGENCE SYSTEM</p>
            </div>

            <div className="bg-[#0d0d0d]/80 backdrop-blur-sm border border-cyan-900/30 rounded-lg p-8 max-w-md mx-auto">
              <div className="mb-6">
                <span className="text-[10px] text-red-400 tracking-wider block mb-2">⚠ SECURE ACCESS REQUIRED</span>
                <p className="text-gray-400 text-sm">
                  Authentication required to access classified intelligence feeds and configure custom monitoring alerts.
                </p>
              </div>

              <Button
                onClick={handleLogin}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3"
              >
                <User className="w-4 h-4 mr-2" />
                AUTHENTICATE
              </Button>

              <p className="text-[10px] text-gray-600 mt-4 tracking-wider">
                ENCRYPTED CONNECTION • TLS 1.3
              </p>
            </div>

            {/* Decorative corners */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-cyan-500/30" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-cyan-500/30" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-cyan-500/30" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-cyan-500/30" />
          </div>
        </div>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-[#0a0a0a] text-white font-mono relative overflow-y-auto xl:overflow-hidden">
        {/* Scan line effect overlay */}
        <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]" 
             style={{
               backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
             }} 
        />
        
        {/* Grid background */}
        <div className="pointer-events-none fixed inset-0 opacity-[0.02]"
             style={{
               backgroundImage: 'linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)',
               backgroundSize: '50px 50px'
             }}
        />

        {/* Status Bar */}
        <StatusBar user={user} onLogout={handleLogout} onShowAlerts={() => setShowAlerts(true)} />

        {/* Market Tickers */}
        <MarketTickers />

        {/* Main Content */}
        <div className="pt-24 pb-4 px-4 flex flex-col xl:flex-row gap-4 xl:h-screen">
          {/* Left Panel - News Feed */}
          <div className="w-full xl:w-80 flex-shrink-0">
            <NewsFeed 
              onSelectNews={setSelectedNews} 
              newsData={newsData}
              setNewsData={setNewsData}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          </div>

          {/* Center - Globe */}
          <div className="flex-1 relative min-h-[360px] xl:min-h-0">
            <GlobeMap 
              newsData={newsData} 
              onSelectNews={setSelectedNews}
            />
          </div>

          {/* Right Panel - Polymarket */}
          <div className="w-full xl:w-80 flex-shrink-0">
            <PolymarketOdds />
          </div>
        </div>

        {/* News Modal */}
        {selectedNews && (
          <NewsModal 
            news={selectedNews} 
            onClose={() => setSelectedNews(null)} 
          />
        )}

        {/* Alerts Panel */}
        <AlertsPanel isOpen={showAlerts} onClose={() => setShowAlerts(false)} />
      </div>
    </QueryClientProvider>
  );
}
