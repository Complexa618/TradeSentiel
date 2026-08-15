import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutGrid, NotebookPen, CalendarDays, Star, Sparkles,
  Image as ImageIcon, Wind, Trophy, LineChart
} from 'lucide-react';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/log-trade', label: 'Log Trade', icon: NotebookPen },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/strategies', label: 'Strategies', icon: Star },
  { to: '/ai-insights', label: 'AI Insights', icon: Sparkles },
  { to: '/vision-board', label: 'Vision Board', icon: ImageIcon },
  { to: '/zen-zone', label: 'Zen Zone', icon: Wind },
  { to: '/milestones', label: 'Milestones', icon: Trophy },
  { to: '/backtest', label: 'Backtest', icon: LineChart },
];

export default function Sidebar({ open, onNavigate }) {
  const location = useLocation();
  return (
    <aside
      className={`fixed lg:static z-40 top-0 left-0 h-full w-[248px] shrink-0 bg-[#0a0b0e] border-r border-white/[0.06] flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
    >
      <div className="h-16 flex items-center gap-3 px-6 border-b border-white/[0.06]">
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-bold text-[#08090c] text-sm shadow-[0_0_20px_-4px_rgba(16,185,129,0.6)]">
          TS
        </div>
        <span className="font-bold tracking-[0.18em] text-[13px] text-white">TRADE SENTINEL</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              onClick={onNavigate}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-white/[0.04]'
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${active ? 'text-emerald-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
              {label}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-white/[0.06]">
        <p className="text-[11px] leading-relaxed text-gray-600">
          <span className="text-emerald-500/80 font-semibold">Sentinel</span> keeps watch.
          Log every trade, trust the process.
        </p>
      </div>
    </aside>
  );
}
