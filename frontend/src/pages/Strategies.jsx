import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { groupStatsBy, strategyStats, comboLeaderboard, fmtMoney, fmtPct, fmtR } from '../lib/calc';
import { Trophy, Medal, Award, TrendingUp, Star, CalendarDays, Layers } from 'lucide-react';

const TABS = [
  { key: 'strategy', label: 'By Strategy', icon: Star },
  { key: 'session', label: 'By Session', icon: CalendarDays },
  { key: 'combo', label: 'Strategy + Session', icon: Layers },
];

export default function Strategies() {
  const { data } = useApp();
  const [tab, setTab] = useState('strategy');
  const active = TABS.find((t) => t.key === tab);
  const board = useMemo(() => {
    if (tab === 'strategy') return strategyStats(data.trades);
    if (tab === 'combo') return comboLeaderboard(data.trades);
    return groupStatsBy(data.trades, (t) => t.session);
  }, [data.trades, tab]);
  const best = board[0];
  const worst = board.length > 1 ? board[board.length - 1] : null;

  return (
    <div className="px-4 lg:px-8 py-6 max-w-[1500px] mx-auto animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-white">Strategies</h1>
        <p className="text-gray-500 mt-1">Which setups, sessions and combinations actually make you money.</p>
      </div>

      <div className="flex gap-1 bg-white/[0.04] rounded-lg p-1 mt-5 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)} className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition ${tab === key ? 'bg-emerald-500/20 text-emerald-300' : 'text-gray-500 hover:text-gray-300'}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {best && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <HeroCard tone="win" title="Top Performer" name={best.label} g={best} />
          {worst && worst.totalProfit < best.totalProfit && <HeroCard tone="loss" title="Needs Work" name={worst.label} g={worst} />}
        </div>
      )}

      <div className="card-surface rounded-2xl mt-4 overflow-hidden">
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-white font-semibold">{active.label} Leaderboard</h3>
          <p className="text-xs text-gray-500">{board.length} groups · sorted by total profit</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="text-left label-caps text-gray-500 border-b border-white/[0.06]">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">{tab === 'session' ? 'Session' : tab === 'combo' ? 'Strategy · Session' : 'Strategy'}</th>
                <th className="px-4 py-3 text-right">Trades</th>
                <th className="px-4 py-3 text-right">W / L</th>
                <th className="px-4 py-3 text-right">Win Rate</th>
                <th className="px-4 py-3 text-right">Avg RR</th>
                <th className="px-4 py-3 text-right">Total Risk</th>
                <th className="px-4 py-3 text-right">Total Reward</th>
                <th className="px-4 py-3 text-right">Avg Profit</th>
                <th className="px-4 py-3 text-right">Best</th>
                <th className="px-4 py-3 text-right">Worst</th>
                <th className="px-4 py-3 text-right">Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {board.map((s, i) => (
                <tr key={s.key} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition">
                  <td className="px-4 py-3">
                    {i === 0 ? <Trophy className="h-4 w-4 text-amber-400" /> : i === 1 ? <Medal className="h-4 w-4 text-gray-400" /> : i === 2 ? <Award className="h-4 w-4 text-amber-700" /> : <span className="text-gray-600">{i + 1}</span>}
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{s.label}</td>
                  <td className="px-4 py-3 text-right text-gray-300 font-mono-num">{s.trades}</td>
                  <td className="px-4 py-3 text-right font-mono-num"><span className="text-emerald-400">{s.wins}</span> <span className="text-gray-600">/</span> <span className="text-red-400">{s.losses}</span></td>
                  <td className="px-4 py-3 text-right text-gray-300 font-mono-num">{fmtPct(s.winRate)}</td>
                  <td className={`px-4 py-3 text-right font-mono-num ${s.avgRR === null ? 'text-gray-500' : s.avgRR >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtR(s.avgRR)}</td>
                  <td className="px-4 py-3 text-right text-red-300/80 font-mono-num">{fmtMoney(s.totalRisk)}</td>
                  <td className={`px-4 py-3 text-right font-mono-num ${s.totalReward >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(s.totalReward)}</td>
                  <td className={`px-4 py-3 text-right font-mono-num ${s.avgProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(s.avgProfit)}</td>
                  <td className="px-4 py-3 text-right text-emerald-400 font-mono-num">{fmtMoney(s.best || 0)}</td>
                  <td className="px-4 py-3 text-right text-red-400 font-mono-num">{fmtMoney(s.worst || 0)}</td>
                  <td className={`px-4 py-3 text-right font-mono-num font-semibold ${s.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(s.totalProfit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!board.length && (
            <div className="text-center py-16">
              <TrendingUp className="h-8 w-8 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-600">No data yet. Log trades with a strategy &amp; session to build these analytics.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HeroCard({ tone, title, name, g }) {
  const win = tone === 'win';
  return (
    <div className="card-surface rounded-2xl p-6 relative overflow-hidden">
      <div className={`absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl ${win ? 'bg-emerald-500/10' : 'bg-red-500/10'}`} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className={`flex items-center gap-2 text-sm ${win ? 'text-emerald-400' : 'text-red-400'}`}>
            <Trophy className="h-4 w-4" /> {title}
          </div>
          <h2 className="text-xl font-bold text-white mt-2">{name}</h2>
          <p className="text-gray-500 text-sm mt-1">{g.trades} trades · {fmtPct(g.winRate)} win · {fmtR(g.avgRR)} avg</p>
        </div>
        <div className="text-right">
          <div className="label-caps text-gray-500">Net Profit</div>
          <div className={`text-3xl font-bold font-mono-num ${g.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(g.totalProfit)}</div>
        </div>
      </div>
    </div>
  );
}
