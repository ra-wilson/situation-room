'use client';
import React, { useState, useEffect } from 'react';
import { Shield, Wifi, Activity, Bell, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { User as SituationUser } from '../domain/types';

type StatusBarProps = {
  user: SituationUser | null;
  onLogout: () => void;
  onShowAlerts: () => void;
};

export default function StatusBar({ user, onLogout, onShowAlerts }: StatusBarProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date) => {
    return date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a] to-transparent">
      <div className="border-b border-cyan-900/30 bg-[#0a0a0a]/90 backdrop-blur-sm">
        <div className="flex items-center justify-between px-3 py-3 sm:px-6">
          {/* Left - Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Shield className="w-5 h-5 text-cyan-400" />
              <span className="text-cyan-400 font-bold tracking-wider text-lg truncate">
                SITUATION MONITOR
              </span>
            </div>
            <div className="hidden md:block h-4 w-px bg-cyan-900/50" />
            <span className="hidden md:inline text-[10px] text-cyan-600 tracking-widest">
              GEOPOLITICAL INTELLIGENCE SYSTEM
            </span>
          </div>

          {/* Center - Status Indicators */}
          <div className="hidden xl:flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-green-400 tracking-wider">SYSTEMS NOMINAL</span>
            </div>
            <div className="flex items-center gap-2">
              <Wifi className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] text-cyan-400 tracking-wider">LIVE FEED</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] text-amber-400 tracking-wider">ELEVATED</span>
            </div>
          </div>

          {/* Right - User & Time */}
          <div className="flex items-center gap-4">
            {/* Alerts Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowAlerts}
              className="h-8 px-3 text-amber-400 hover:text-amber-300 hover:bg-amber-900/20 border border-amber-900/30"
            >
              <Bell className="w-4 h-4 mr-2" />
              <span className="text-[10px] tracking-wider">ALERTS</span>
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-3 text-cyan-400 hover:bg-cyan-900/20 border border-cyan-900/30">
                  <User className="w-4 h-4 mr-2" />
                  <span className="text-[10px] tracking-wider max-w-[100px] truncate">
                    {user?.full_name || user?.email || 'OPERATOR'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#0a0a0a] border-cyan-900/30 text-white">
                <div className="px-3 py-2">
                  <p className="text-xs text-cyan-400 font-bold">{user?.full_name || 'Operator'}</p>
                  <p className="text-[10px] text-gray-500">{user?.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-cyan-900/30" />
                <DropdownMenuItem onClick={onShowAlerts} className="text-xs cursor-pointer hover:bg-cyan-900/20">
                  <Bell className="w-3 h-3 mr-2" />
                  Manage Alerts
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-cyan-900/30" />
                <DropdownMenuItem onClick={onLogout} className="text-xs text-red-400 cursor-pointer hover:bg-red-900/20">
                  <LogOut className="w-3 h-3 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Time */}
            <div className="hidden lg:block text-right">
              <div className="text-cyan-300 text-sm font-bold tracking-wider">
                {formatTime(time)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
