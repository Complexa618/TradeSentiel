import React from 'react';
import { Menu, Plus, ChevronDown, LogOut, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLocation } from 'react-router-dom';
import NewsCountdown from './NewsCountdown';
import { Avatar } from './Avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from './ui/dropdown-menu';

const TITLES = {
  '/dashboard': 'Dashboard', '/log-trade': 'Log Trade', '/calendar': 'Calendar',
  '/strategies': 'Strategies', '/ai-insights': 'AI Insights', '/vision-board': 'Vision Board',
  '/zen-zone': 'Zen Zone', '/milestones': 'Milestones', '/backtest': 'Backtest',
};

export default function TopBar({ onToggleSidebar, onAddTrade }) {
  const { user, logout } = useApp();
  const location = useLocation();
  const title = TITLES[location.pathname] || 'Dashboard';

  return (
    <header className="h-16 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 bg-[#08090c]/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="lg:hidden p-2 rounded-md hover:bg-white/[0.06] text-gray-300">
          <Menu className="h-5 w-5" />
        </button>
        <span className="label-caps text-gray-400">{title}</span>
      </div>

      <div className="flex items-center gap-3">
        <NewsCountdown />
        <button
          onClick={onAddTrade}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-500 text-[#062017] text-sm font-semibold px-3.5 py-2 transition-all shadow-[0_4px_20px_-6px_rgba(16,185,129,0.7)] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> Add Trade
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg pl-1.5 pr-2 py-1.5 hover:bg-white/[0.05] transition-colors">
              <Avatar name={user?.name} picture={user?.picture} size={32} />
              <div className="hidden sm:block text-left leading-tight">
                <div className="text-sm font-medium text-white">{user?.name || 'Trader'}</div>
                <div className="text-[11px] text-gray-500">{user?.email}</div>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-[#101216] border-white/10 text-gray-200">
            <DropdownMenuLabel className="text-gray-400">@{user?.username}</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="gap-2 focus:bg-white/[0.06] focus:text-white cursor-pointer">
              <User className="h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout} className="gap-2 text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer">
              <LogOut className="h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
