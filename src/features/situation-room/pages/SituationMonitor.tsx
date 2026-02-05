'use client';

import React, { useState, useEffect, useMemo } from 'react';
import GlobeMap from '../components/GlobeMap';
import NewsFeed from '../components/NewsPanel';
import MarketTickers from '../components/MarketTickers';
import PolymarketOdds from '../components/PolymarketOdds';
import NewsModal from '../components/NewsModal';
import StatusBar from '../components/StatusBar';
import AlertsPanel from '../components/AlertsPanel';
import { authClient } from '../data/authClient';
import type { NewsItem, User as SituationUser } from '../domain/types';
import { signIn, signOut, useSession } from 'next-auth/react';

export default function SituationMonitor() {
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [user, setUser] = useState<SituationUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const { data: session, status } = useSession();
  const isSessionAuthenticated = status === 'authenticated';
  const isDevAccess = process.env.NODE_ENV !== 'production';

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
    }
  };

  const sessionUser = useMemo<SituationUser | null>(() => {
    if (!session?.user) return null;
    return {
      id: session.user.email ?? 'session-user',
      full_name: session.user.name ?? undefined,
      email: session.user.email ?? undefined,
      role: 'user',
    };
  }, [session]);

  const canManageAlerts = isAuthenticated || isSessionAuthenticated;
  const activeUser = sessionUser ?? user;

  const handleLogin = async () => {
    if (isDevAccess) {
      const loggedInUser = await authClient.login();
      setUser(loggedInUser);
      setIsAuthenticated(true);
      return;
    }
    await signIn();
  };

  const handleLogout = async () => {
    if (isSessionAuthenticated) {
      await signOut();
      setShowAlerts(false);
      return;
    }
    await authClient.logout();
    setUser(null);
    setIsAuthenticated(false);
    setShowAlerts(false);
  };

  const handleShowAlerts = () => {
    if (!canManageAlerts) return;
    setShowAlerts(true);
  };

  return (
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
        <StatusBar
          user={activeUser}
          canManageAlerts={canManageAlerts}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onShowAlerts={handleShowAlerts}
        />

        {/* Market Tickers */}
        <MarketTickers />

        {/* Main Content */}
        <div className="pt-28 pb-4 pl pr-2 flex flex-col xl:flex-row gap-4 xl:h-screen">
          {/* Left Panel - News Feed */}
          <div className="w-full xl:w-80 flex-shrink-0">
            <NewsFeed 
              onSelectNews={setSelectedNews} 
              newsData={newsData}
              setNewsData={setNewsData}
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
        <AlertsPanel
          isOpen={showAlerts}
          onClose={() => setShowAlerts(false)}
          canManageAlerts={canManageAlerts}
        />
      </div>
  );
}
