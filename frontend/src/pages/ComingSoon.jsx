import React from 'react';
import { useLocation } from 'react-router-dom';
import { Image as ImageIcon, Wind, Trophy, LineChart, Sparkles, Lock } from 'lucide-react';

const CONFIG = {
  '/ai-insights': { title: 'AI Insights', icon: Sparkles, desc: 'AI-driven pattern detection and coaching on your logged trades.' },
  '/vision-board': { title: 'Vision Board', icon: ImageIcon, desc: 'Pin your goals, target accounts, and the trader you\u2019re becoming.' },
  '/zen-zone': { title: 'Zen Zone', icon: Wind, desc: 'Breathing, journaling and mindset resets between sessions.' },
  '/milestones': { title: 'Milestones', icon: Trophy, desc: 'Track streaks, ranks and career-defining trading achievements.' },
  '/backtest': { title: 'Backtest', icon: LineChart, desc: 'Replay historical setups and validate your edge before going live.' },
};

export default function ComingSoon() {
  const { pathname } = useLocation();
  const c = CONFIG[pathname] || { title: 'Module', icon: Sparkles, desc: '' };
  const Icon = c.icon;

  return (
    <div className="px-4 lg:px-8 py-6 max-w-[1400px] mx-auto animate-fade-up">
      <h1 className="text-2xl font-bold text-white">{c.title}</h1>
      <p className="text-gray-500 mt-1">{c.desc}</p>

      <div className="card-surface rounded-2xl mt-6 p-12 flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5">
          <Icon className="h-7 w-7 text-emerald-400" />
        </div>
        <div className="relative inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full mb-4">
          <Lock className="h-3 w-3" /> Coming Soon
        </div>
        <h2 className="relative text-xl font-semibold text-white">This module isn't in the current build yet.</h2>
        <p className="relative text-gray-500 mt-2 max-w-md">Dashboard, Journal, Calendar, and Strategies are fully wired up — the rest ship next.</p>
      </div>
    </div>
  );
}
