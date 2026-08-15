import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { computeStats, equityCurve, dailyPnl, sessionBreakdown, strategyLeaderboard, filterTrades, distinctStrategies, fmtMoney, fmtPct, fmtR } from '../lib/calc';
import { AreaChart, LineChartSimple, BarChart, Gauge } from '../components/Charts';
import { MOTIVATION } from '../mock';
import { SESSIONS } from '../mock';
import ManageAccountsModal from '../components/ManageAccountsModal';
import GoalsModal from '../components/GoalsModal';
import DarkSelect from '../components/DarkSelect';
import AnimatedNumber from '../components/AnimatedNumber';
import {
  Plus, ExternalLink, TrendingUp, TrendingDown, Activity, Sparkles, Target,
  Database, ArrowUpRight, ArrowDownRight, Clock, Filter
} from 'lucide-react';

const RANGES = { 'All': null, '7D': 7, '30D': 30, '90D': 90, '1Y': 365 };

export default function Dashboard() {
  const { user, data, loadDemo } = useApp();
  const { openAddTrade } = useOutletContext();
  const navigate = useNavigate();
  const trades = data.trades;

  const [hideBalance, setHideBalance] = useState(false);
  const [hideUsername, setHideUsername] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [range, setRange] = useState('30D');
  const [fStrategy, setFStrategy] = useState('All');
  const [fSession, setFSession] = useState('All');
  const [chartTab, setChartTab] = useState('equity');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const strategyOptions = useMemo(() => distinctStrategies(trades), [trades]);

  // Global filtered set drives all analytics on the dashboard
  const filtered = useMemo(
    () => filterTrades(trades, { strategy: fStrategy, session: fSession, days: RANGES[range] }),
    [trades, fStrategy, fSession, range]
  );
  const filtersActive = fStrategy !== 'All' || fSession !== 'All' || range !== 'All';

  const stats = useMemo(() => computeStats(filtered), [filtered]);
  const allTimeStats = useMemo(() => computeStats(trades), [trades]);
  const rangedTrades = filtered;

  const equity = useMemo(() => equityCurve(rangedTrades), [rangedTrades]);
  const daily = useMemo(() => dailyPnl(rangedTrades), [rangedTrades]);
  const winRateSeries = useMemo(() => {
    let wins = 0;
    const sorted = rangedTrades.filter((t) => t.status === 'closed').sort((a, b) => new Date(a.date) - new Date(b.date));
    return sorted.map((t, i) => { if (Number(t.pnl) > 0) wins++; return (wins / (i + 1)) * 100; });
  }, [rangedTrades]);
  const sessions = useMemo(() => sessionBreakdown(filtered), [filtered]);
  const totalBalance = data.accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
  const todayPnl = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return trades.filter((t) => (t.date || '').slice(0, 10) === today && t.status === 'closed')
      .reduce((s, t) => s + Number(t.pnl || 0), 0);
  }, [trades]);

  const rankLabel = allTimeStats.total === 0 ? 'Initiate Rank' : allTimeStats.total < 10 ? 'Recruit' : allTimeStats.total < 30 ? 'Operator' : 'Sentinel';
  const motiv = MOTIVATION[allTimeStats.total % MOTIVATION.length];

  return (
    <div className="px-4 lg:px-8 py-6 max-w-[1500px] mx-auto animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Welcome back.</h1>
          <p className="text-gray-500 mt-1">{motiv}</p>
          <div className="flex items-center gap-3 mt-4">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-[#08090c] text-sm font-bold">
              {(user?.name || 'T').charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-white">{user?.name || 'Trader'}</span>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 label-caps">
              {allTimeStats.total} Trades Logged
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 text-sm text-gray-200 px-3.5 py-2 hover:bg-white/[0.05] transition">
            <Sparkles className="h-4 w-4 text-emerald-400" /> {rankLabel}
          </button>
          <button onClick={openAddTrade} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-emerald-400 to-emerald-500 text-[#062017] text-sm font-semibold px-3.5 py-2 hover:from-emerald-300 transition shadow-[0_4px_20px_-6px_rgba(16,185,129,0.7)]">
            <Plus className="h-4 w-4" /> Add Trade
          </button>
        </div>
      </div>

      {/* Global Filters */}
      <div className="mt-5 flex flex-wrap items-center gap-3 p-3 card-surface rounded-xl">
        <div className="flex items-center gap-1.5 text-gray-400 text-sm pl-1">
          <Filter className="h-4 w-4 text-emerald-400" /> <span className="label-caps">Filters</span>
        </div>
        <FilterSelect label="Strategy" value={fStrategy} onChange={setFStrategy} options={strategyOptions} />
        <FilterSelect label="Session" value={fSession} onChange={setFSession} options={SESSIONS} />
        <div className="flex gap-1 bg-white/[0.04] rounded-lg p-1">
          {Object.keys(RANGES).map((r) => (
            <button key={r} onClick={() => setRange(r)} className={`px-3 py-1 rounded-md text-xs font-medium transition ${range === r ? 'bg-emerald-500/20 text-emerald-300' : 'text-gray-500 hover:text-gray-300'}`}>{r}</button>
          ))}
        </div>
        {filtersActive && (
          <button onClick={() => { setFStrategy('All'); setFSession('All'); setRange('All'); }} className="text-xs text-gray-400 hover:text-white ml-auto">Reset</button>
        )}
        <span className={`text-xs text-gray-500 ${filtersActive ? '' : 'ml-auto'}`}>{stats.total} of {allTimeStats.total} trades</span>
      </div>

      {/* Group P&L Card */}
      <div className="mt-6 card-surface rounded-2xl p-5 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 pulse-dot" />
            <span className="label-caps text-gray-400">Group P&L Card</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <PillBtn onClick={() => setManageOpen(true)} active>Manage Accounts</PillBtn>
            <PillBtn>Share Card</PillBtn>
            <PillBtn onClick={() => setHideBalance((v) => !v)}>{hideBalance ? 'Show Balance' : 'Hide Balance'}</PillBtn>
            <PillBtn onClick={() => setHideUsername((v) => !v)}>{hideUsername ? 'Show Username' : 'Hide Username'}</PillBtn>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-[#08090c] font-bold">
                {(user?.name || 'T').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-white font-semibold">{hideUsername ? 'Hidden' : user?.name || 'Trader'}</div>
                <div className="text-xs text-gray-500">{hideUsername ? '@\u2022\u2022\u2022\u2022' : `@${user?.username}`} · {data.accounts.length} accounts synced</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="label-caps text-gray-500">Total Balance</div>
              <div className="text-2xl font-bold text-white font-mono-num mt-1">{fmtMoney(totalBalance, hideBalance)}</div>
            </div>
          </div>
          <div>
            <div className="label-caps text-gray-500">Accounts</div>
            <div className="text-2xl font-bold text-white font-mono-num mt-1">{data.accounts.length}</div>
            <div className="text-xs text-gray-600 mt-1">{data.accounts.length ? data.accounts.map((a) => a.name).join(', ') : 'No accounts yet'}</div>
          </div>
          <div>
            <div className="label-caps text-gray-500 flex items-center gap-1">Today's Group P&L <ExternalLink className="h-3 w-3" /></div>
            <div className={`text-2xl font-bold font-mono-num mt-1 ${todayPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(todayPnl, hideBalance)}</div>
          </div>
        </div>

        <div className="dash-border h-px my-5" />
        <div className="flex items-center justify-between text-xs">
          <span className="text-emerald-500/70 font-medium">Powered by Trade Sentinel</span>
          <span className="text-gray-600 font-mono-num">{now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, {now.toLocaleTimeString('en-GB')}</span>
        </div>
      </div>

      {allTimeStats.total === 0 && (
        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-emerald-400" />
            <p className="text-sm text-gray-300">Empty journal. Add your first trade or load demo data to explore the analytics.</p>
          </div>
          <button onClick={loadDemo} className="text-sm font-medium text-emerald-400 hover:text-emerald-300 whitespace-nowrap">Load Demo Data</button>
        </div>
      )}

      {/* Performance Overview */}
      <SectionTitle>Performance Overview</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <Stat label="Win Rate" num={stats.winRate} format={(n) => fmtPct(n)} sub={`${stats.wins}W · ${stats.losses}L`} tone="green" />
        <Stat label="Tag Coverage" num={stats.tagCoverage} format={(n) => fmtPct(n)} sub="Tag trades to track" tone="green" />
        <Stat label="Net P/L" num={stats.netPL} format={(n) => fmtMoney(n)} sub="All-time" tone={stats.netPL >= 0 ? 'green' : 'red'} />
        <Stat label="Max Win" num={stats.maxWin} format={(n) => fmtMoney(n)} sub="Biggest gain" tone="green" />
        <Stat label="Max Loss" num={stats.maxLoss} format={(n) => fmtMoney(n)} sub="Biggest drawdown" tone="red" />
        <Stat label="Avg R:R" num={stats.avgRR} format={(n) => `${n.toFixed(2)}R`} sub="Closed trades" tone="green" />
        <Stat label="Executed" num={stats.executed} format={(n) => `${Math.round(n)}`} sub="Total trades" tone="white" />
      </div>

      {/* Institutional Analytics */}
      <SectionTitle>Institutional Analytics</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <BigStat label="Avg Win Hold Time" value={fmtHold(stats.avgWinHold)} sub="Across winning trades" icon={Clock} tone="green" />
        <BigStat label="Avg Loss Hold Time" value={fmtHold(stats.avgLossHold)} sub="Across losing trades" icon={Clock} tone="red" />
        <BigStat label="RR Realization Score" value={fmtPct(stats.rrRealization)} sub={stats.rrRealization < 60 ? 'Cutting too early' : 'Letting winners run'} icon={Target} tone="green" />
      </div>

      {/* Weekday + Performance Score */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="card-surface rounded-2xl p-6">
          <h3 className="text-white font-semibold">Weekday Breakdown</h3>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <DayStat label="Best Trading Day" value={stats.bestDay} up />
            <DayStat label="Worst Trading Day" value={stats.worstDay} />
          </div>
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="label-caps text-gray-500">Win Rate %</span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" /> LIVE</span>
            </div>
            <LineChartSimple data={winRateSeries} height={120} />
          </div>
        </div>
        <div className="card-surface rounded-2xl p-6 flex flex-col items-center justify-center">
          <h3 className="text-white font-semibold self-start">Performance Score</h3>
          <div className="label-caps text-gray-500 mt-4">Your Performance Score</div>
          <Gauge value={stats.performanceScore} size={200} />
          <div className="flex gap-4 text-xs text-gray-600 font-mono-num">0 · 25 · 50 · 75 · 100</div>
        </div>
      </div>

      {/* Performance Analytics */}
      <div className="card-surface rounded-2xl p-6 mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-white font-semibold">Performance Analytics</h3>
            <p className="text-xs text-gray-500 mt-0.5">Live · {fStrategy !== 'All' ? fStrategy : 'All strategies'} · {fSession !== 'All' ? fSession : 'All sessions'} · {range}</p>
          </div>
          <div className="flex gap-1 bg-white/[0.04] rounded-lg p-1">
            {Object.keys(RANGES).map((r) => (
              <button key={r} onClick={() => setRange(r)} className={`px-3 py-1 rounded-md text-xs font-medium transition ${range === r ? 'bg-emerald-500/20 text-emerald-300' : 'text-gray-500 hover:text-gray-300'}`}>{r}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 mt-4 border-b border-white/[0.06]">
          {[['equity', 'Equity Curve'], ['winrate', 'Win Rate'], ['daily', 'Daily P&L']].map(([k, l]) => (
            <button key={k} onClick={() => setChartTab(k)} className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${chartTab === k ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>{l}</button>
          ))}
        </div>
        <div className="mt-5">
          {chartTab === 'equity' && <AreaChart data={equity} height={240} />}
          {chartTab === 'winrate' && <LineChartSimple data={winRateSeries} height={240} />}
          {chartTab === 'daily' && <BarChart data={daily} height={240} />}
        </div>
      </div>

      {/* Goals + Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="card-surface rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Trading Goals</h3>
            <button onClick={() => setGoalsOpen(true)} className="text-xs text-emerald-400 hover:text-emerald-300 transition">Edit Goals</button>
          </div>
          <div className="space-y-4 mt-5">
            {data.goals.map((g) => {
              const current = liveGoal(g, stats);
              const pct = Math.min((current / g.target) * 100, 100);
              return (
                <div key={g.id}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-300">{g.label}</span>
                    <span className="text-gray-400 font-mono-num">{g.unit === '$' ? fmtMoney(current) : `${current.toFixed(g.unit === 'R' ? 2 : 0)}${g.unit}`} / {g.unit === '$' ? fmtMoney(g.target) : `${g.target}${g.unit}`}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card-surface rounded-2xl p-6">
          <h3 className="text-white font-semibold">Session Breakdown</h3>
          <div className="space-y-3 mt-5">
            {sessions.map((s) => (
              <div key={s.session} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03]">
                <div>
                  <div className="text-sm text-white font-medium">{s.session}</div>
                  <div className="text-xs text-gray-500">{s.trades} trades · {fmtPct(s.winRate)} win</div>
                </div>
                <div className={`font-mono-num font-semibold ${s.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(s.pnl)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trade Log preview */}
      <div className="card-surface rounded-2xl p-6 mt-4 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">Trade Log</h3>
            <p className="text-xs text-gray-500 mt-0.5">{trades.length} entries</p>
          </div>
          <button onClick={() => navigate('/log-trade')} className="text-sm text-emerald-400 hover:text-emerald-300">View journal</button>
        </div>
        <div className="mt-4 space-y-2">
          {trades.slice(0, 5).map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] transition">
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${t.direction === 'long' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                  {t.direction === 'long' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
                <div>
                  <div className="text-sm text-white font-medium">{t.symbol}</div>
                  <div className="text-xs text-gray-500">{(t.strategies && t.strategies.length ? t.strategies.join(', ') : (t.strategy || 'Unclassified'))} · {t.session}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-mono-num font-semibold ${Number(t.pnl) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(t.pnl)}</div>
                <div className="text-xs text-gray-500 font-mono-num">{fmtR(t.rMultiple)}</div>
              </div>
            </div>
          ))}
          {!trades.length && <div className="text-sm text-gray-600 py-8 text-center">No trades logged yet.</div>}
        </div>
      </div>

      <ManageAccountsModal open={manageOpen} onClose={() => setManageOpen(false)} />
      <GoalsModal open={goalsOpen} onClose={() => setGoalsOpen(false)} />
    </div>
  );
}

function liveGoal(g, stats) {
  if (g.label.includes('Net')) return stats.netPL;
  if (g.label.includes('Win Rate')) return stats.winRate;
  if (g.label.includes('Logged')) return stats.total;
  if (g.label.includes('R:R')) return stats.avgRR;
  return g.current;
}
const fmtHold = (m) => { if (m === null || m === undefined) return '—'; if (m < 60) return `${Math.round(m)}m`; return `${(m / 60).toFixed(1)}h`; };

const SectionTitle = ({ children }) => <h2 className="text-lg font-semibold text-white mt-8 mb-3">{children}</h2>;
const FilterSelect = ({ label, value, onChange, options }) => {
  const opts = [{ value: 'All', label: `All ${label === 'Strategy' ? 'Strategies' : 'Sessions'}` }, ...options.map((o) => ({ value: o, label: o }))];
  return (
    <DarkSelect value={value} onValueChange={onChange} options={opts} triggerClassName="py-1.5 text-xs font-medium min-w-[150px]" />
  );
};
const PillBtn = ({ children, onClick, active }) => (
  <button onClick={onClick} className={`text-xs font-medium px-3 py-1.5 rounded-md transition ${active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/[0.05] text-gray-300 hover:bg-white/[0.08] border border-white/[0.06]'}`}>{children}</button>
);
const toneColor = { green: 'text-emerald-400', red: 'text-red-400', white: 'text-white' };
const Stat = ({ label, value, num, format, sub, tone }) => (
  <div className="card-surface card-lift rounded-xl p-4">
    <div className="label-caps text-gray-500">{label}</div>
    <div className={`text-xl font-bold font-mono-num mt-2 ${toneColor[tone]}`}>
      {num != null && format ? <AnimatedNumber value={num} format={format} /> : value}
    </div>
    <div className="text-xs text-gray-600 mt-1">{sub}</div>
  </div>
);
const BigStat = ({ label, value, sub, icon: Icon, tone }) => (
  <div className="card-surface rounded-xl p-5">
    <div className="flex items-center justify-between">
      <div className="label-caps text-gray-500">{label}</div>
      <Icon className="h-4 w-4 text-gray-600" />
    </div>
    <div className={`text-2xl font-bold font-mono-num mt-3 ${toneColor[tone]}`}>{value}</div>
    <div className="text-xs text-gray-600 mt-1">{sub}</div>
  </div>
);
const DayStat = ({ label, value, up }) => (
  <div className="p-4 rounded-lg bg-white/[0.03]">
    <div className="label-caps text-gray-500">{label}</div>
    <div className="flex items-center gap-2 mt-2">
      {value ? (up ? <ArrowUpRight className="h-4 w-4 text-emerald-400" /> : <ArrowDownRight className="h-4 w-4 text-red-400" />) : null}
      <span className={`font-semibold ${value ? (up ? 'text-emerald-400' : 'text-red-400') : 'text-gray-600'}`}>{value || '—'}</span>
    </div>
  </div>
);
