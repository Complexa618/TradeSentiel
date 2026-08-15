import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { computeStats, fmtMoney } from '../lib/calc';
import { Trophy, Flame, Target, TrendingUp, Award, ShieldCheck, Star, Lock, Zap } from 'lucide-react';

function streaks(trades) {
  const closed = trades.filter((t) => t.status === 'closed')
    .slice().sort((a, b) => new Date(a.date || a.entryTime) - new Date(b.date || b.entryTime));
  let cur = 0, best = 0, curLoss = 0;
  closed.forEach((t) => {
    if (Number(t.pnl) > 0) { cur += 1; best = Math.max(best, cur); curLoss = 0; }
    else if (Number(t.pnl) < 0) { curLoss += 1; cur = 0; }
  });
  // current streak = trailing wins
  let trailing = 0;
  for (let i = closed.length - 1; i >= 0; i--) { if (Number(closed[i].pnl) > 0) trailing += 1; else break; }
  return { current: trailing, best };
}

export default function Milestones() {
  const { data } = useApp();
  const stats = useMemo(() => computeStats(data.trades), [data.trades]);
  const st = useMemo(() => streaks(data.trades), [data.trades]);

  const badges = [
    { icon: Star, label: 'First Blood', desc: 'Log your first trade', done: stats.total >= 1 },
    { icon: TrendingUp, label: 'Getting Started', desc: 'Log 10 trades', done: stats.total >= 10, progress: Math.min(stats.total / 10, 1) },
    { icon: Award, label: 'Operator', desc: 'Log 30 trades', done: stats.total >= 30, progress: Math.min(stats.total / 30, 1) },
    { icon: Trophy, label: 'Century', desc: 'Log 100 trades', done: stats.total >= 100, progress: Math.min(stats.total / 100, 1) },
    { icon: Flame, label: 'On Fire', desc: '5-trade win streak', done: st.best >= 5, progress: Math.min(st.best / 5, 1) },
    { icon: Zap, label: 'Unstoppable', desc: '10-trade win streak', done: st.best >= 10, progress: Math.min(st.best / 10, 1) },
    { icon: Target, label: 'Sharpshooter', desc: '60%+ win rate (10+ trades)', done: stats.closedCount >= 10 && stats.winRate >= 60 },
    { icon: ShieldCheck, label: 'Disciplined', desc: '80%+ trades tagged', done: stats.total >= 5 && stats.tagCoverage >= 80, progress: Math.min(stats.tagCoverage / 80, 1) },
    { icon: TrendingUp, label: 'In Profit', desc: 'Reach positive net P&L', done: stats.netPL > 0 },
  ];
  const unlocked = badges.filter((b) => b.done).length;

  return (
    <div className="px-4 lg:px-8 py-6 max-w-[1400px] mx-auto">
      <h1 className="text-2xl font-bold text-white">Milestones</h1>
      <p className="text-gray-500 mt-1">Streaks, ranks and discipline — earned from how you actually trade.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        <Hero icon={Flame} label="Current Win Streak" value={`${st.current}`} sub="consecutive wins" tone="amber" />
        <Hero icon={Trophy} label="Best Win Streak" value={`${st.best}`} sub="all-time record" tone="emerald" />
        <Hero icon={Award} label="Achievements" value={`${unlocked}/${badges.length}`} sub="unlocked" tone="emerald" />
        <Hero icon={TrendingUp} label="Net P&L" value={fmtMoney(stats.netPL)} sub="all-time" tone={stats.netPL >= 0 ? 'emerald' : 'red'} />
      </div>

      <h2 className="text-lg font-semibold text-white mt-8 mb-3">Achievements</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {badges.map((b) => {
          const Icon = b.icon;
          return (
            <div key={b.label} className={`card-surface card-lift rounded-2xl p-5 flex items-center gap-4 ${b.done ? '' : 'opacity-70'}`}>
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${b.done ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/[0.04] text-gray-600'}`}>
                {b.done ? <Icon className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${b.done ? 'text-white' : 'text-gray-400'}`}>{b.label}</span>
                  {b.done && <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Unlocked</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{b.desc}</p>
                {!b.done && b.progress != null && (
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mt-2">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700" style={{ width: `${(b.progress * 100).toFixed(0)}%` }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const toneMap = { amber: 'text-amber-400', emerald: 'text-emerald-400', red: 'text-red-400' };
function Hero({ icon: Icon, label, value, sub, tone }) {
  return (
    <div className="card-surface card-lift rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="label-caps text-gray-500">{label}</span>
        <Icon className={`h-4 w-4 ${toneMap[tone]}`} />
      </div>
      <div className={`text-3xl font-bold font-mono-num mt-3 ${toneMap[tone]}`}>{value}</div>
      <div className="text-xs text-gray-600 mt-1">{sub}</div>
    </div>
  );
}
