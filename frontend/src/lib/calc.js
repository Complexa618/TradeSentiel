// Trade analytics calculations for Trade Sentinel

export const fmtMoney = (n, hide = false) => {
  if (hide) return '••••••';
  const v = Number(n || 0);
  const sign = v < 0 ? '-' : '';
  return `${sign}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const fmtPct = (n) => `${Number(n || 0).toFixed(1)}%`;

// RR can be null (Risk = 0 / invalid) -> show N/A safely
export const fmtR = (r) => (r === null || r === undefined || isNaN(r)) ? 'N/A' : `${Number(r).toFixed(2)}R`;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const closedTrades = (trades) => trades.filter((t) => t.status === 'closed');

export function computeStats(trades) {
  const closed = closedTrades(trades);
  const wins = closed.filter((t) => Number(t.pnl) > 0);
  const losses = closed.filter((t) => Number(t.pnl) < 0);
  const netPL = closed.reduce((s, t) => s + Number(t.pnl || 0), 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
  const maxWin = wins.length ? Math.max(...wins.map((t) => Number(t.pnl))) : 0;
  const maxLoss = losses.length ? Math.min(...losses.map((t) => Number(t.pnl))) : 0;
  const rMultiples = closed.map((t) => t.rMultiple).filter((r) => r !== null && r !== undefined && !isNaN(r)).map(Number);
  const avgRR = rMultiples.length ? rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length : 0;
  const tagged = trades.filter((t) => (t.tags || []).length > 0);
  const tagCoverage = trades.length ? (tagged.length / trades.length) * 100 : 0;

  const holdMinutes = (t) => {
    if (!t.entryTime || !t.exitTime) return null;
    const a = new Date(t.entryTime).getTime();
    const b = new Date(t.exitTime).getTime();
    if (isNaN(a) || isNaN(b) || b < a) return null;
    return (b - a) / 60000;
  };
  const avgHold = (arr) => {
    const vals = arr.map(holdMinutes).filter((x) => x !== null);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  const avgWinHold = avgHold(wins);
  const avgLossHold = avgHold(losses);

  // RR Realization: how strong winners are in R terms (normalized 0-100)
  const winnerRs = wins.map((t) => Number(t.rMultiple)).filter((r) => !isNaN(r) && r > 0);
  const avgWinnerR = winnerRs.length ? winnerRs.reduce((a, b) => a + b, 0) / winnerRs.length : 0;
  const rrRealization = Math.max(0, Math.min(avgWinnerR / 3, 1)) * 100;

  // Weekday breakdown
  const byDay = {};
  closed.forEach((t) => {
    const d = new Date(t.date || t.entryTime);
    if (isNaN(d)) return;
    const key = WEEKDAYS[d.getDay()];
    byDay[key] = (byDay[key] || 0) + Number(t.pnl || 0);
  });
  const dayEntries = Object.entries(byDay);
  let bestDay = null, worstDay = null;
  if (dayEntries.length) {
    bestDay = dayEntries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    worstDay = dayEntries.reduce((a, b) => (b[1] < a[1] ? b : a))[0];
  }

  // Performance score (composite 0-100)
  let score = 0;
  if (closed.length) {
    const winComp = Math.min(winRate, 100) * 0.4;
    const rrComp = Math.max(0, Math.min(avgRR / 3, 1)) * 100 * 0.35;
    const disComp = Math.min(tagCoverage, 100) * 0.25;
    score = winComp + rrComp + disComp;
  }

  return {
    total: trades.length,
    executed: trades.length,
    closedCount: closed.length,
    wins: wins.length,
    losses: losses.length,
    netPL,
    winRate,
    maxWin,
    maxLoss,
    avgRR,
    tagCoverage,
    avgWinHold,
    avgLossHold,
    rrRealization,
    bestDay,
    worstDay,
    performanceScore: score,
  };
}

// Sum of realized P&L across all closed trades
export const realizedPnl = (trades) => closedTrades(trades).reduce((s, t) => s + Number(t.pnl || 0), 0);

// Sum of account starting balances (baseline capital)
export const startingBalance = (accounts = []) => accounts.reduce((s, a) => s + Number(a.balance || 0), 0);

// Total balance = starting capital + realized P&L
export const totalBalance = (accounts, trades) => startingBalance(accounts) + realizedPnl(trades);

// Equity curve baselined at starting capital, growing chronologically per closed trade.
export function equityCurve(trades, base = 0) {
  const closed = closedTrades(trades)
    .slice()
    .sort((a, b) => new Date(a.date || a.entryTime) - new Date(b.date || b.entryTime));
  let cum = Number(base) || 0;
  const points = [];
  // Anchor at the starting balance, dated just before the first trade
  if (closed.length) {
    const firstDate = new Date(closed[0].date || closed[0].entryTime);
    const anchor = isNaN(firstDate) ? new Date() : new Date(firstDate.getTime() - 86400000);
    points.push({ date: anchor.toISOString(), value: cum, symbol: 'Start' });
  }
  closed.forEach((t) => {
    cum += Number(t.pnl || 0);
    points.push({ date: t.date || t.entryTime, value: cum, symbol: t.symbol });
  });
  return points;
}

export function dailyPnl(trades) {
  const closed = closedTrades(trades);
  const map = {};
  closed.forEach((t) => {
    const d = new Date(t.date || t.entryTime);
    if (isNaN(d)) return;
    const key = d.toISOString().slice(0, 10);
    map[key] = (map[key] || 0) + Number(t.pnl || 0);
  });
  return Object.entries(map)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

// ---- Dynamic (user-defined) strategy/session helpers ----

// Normalized key for case/space-insensitive dedupe
export const normKey = (s) => (s || '').toString().trim().replace(/\s+/g, ' ').toLowerCase();
const cleanLabel = (s) => (s || '').toString().trim().replace(/\s+/g, ' ');

// A trade can carry multiple strategy tags. Return them (falling back to legacy string).
export const tradeStrategies = (t) => {
  if (Array.isArray(t.strategies) && t.strategies.length) return t.strategies;
  if (t.strategy) return [t.strategy];
  return ['Unclassified'];
};

// Distinct display values for a field (deduped case-insensitively, first-seen label kept)
export function distinctValues(trades, field) {
  const map = {};
  trades.forEach((t) => {
    const raw = cleanLabel(t[field]);
    if (!raw) return;
    const k = raw.toLowerCase();
    if (!map[k]) map[k] = raw;
  });
  return Object.values(map).sort((a, b) => a.localeCompare(b));
}

// Distinct strategy names across all trades (handles arrays)
export function distinctStrategies(trades) {
  const map = {};
  trades.forEach((t) => tradeStrategies(t).forEach((s) => {
    const r = cleanLabel(s);
    if (!r || r === 'Unclassified') return;
    const k = r.toLowerCase();
    if (!map[k]) map[k] = r;
  }));
  return Object.values(map).sort((a, b) => a.localeCompare(b));
}

// Filter trades by strategy / session / date range (days)
export function filterTrades(trades, { strategy = 'All', session = 'All', days = null } = {}) {
  let list = trades;
  if (days) {
    const cut = Date.now() - days * 86400000;
    list = list.filter((t) => new Date(t.date || t.entryTime).getTime() >= cut);
  }
  if (strategy && strategy !== 'All') list = list.filter((t) => tradeStrategies(t).some((s) => normKey(s) === normKey(strategy)));
  if (session && session !== 'All') list = list.filter((t) => normKey(t.session) === normKey(session));
  return list;
}

// Trade duration
export function tradeDurationMin(t) {
  if (!t || !t.entryTime || !t.exitTime) return null;
  const a = new Date(t.entryTime).getTime();
  const b = new Date(t.exitTime).getTime();
  if (isNaN(a) || isNaN(b) || b < a) return null;
  return (b - a) / 60000;
}
export function fmtDuration(t) {
  const m = tradeDurationMin(t);
  if (m === null) return '—';
  const total = Math.round(m);
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const mm = total % 60;
  return `${h}h ${String(mm).padStart(2, '0')}m`;
}

// Generic per-group analytics. getRaw(t) returns the display string for the group.
export function groupStatsBy(trades, getRaw) {
  const closed = closedTrades(trades);
  const map = {};
  closed.forEach((t) => {
    const raw = cleanLabel(getRaw(t)) || 'Unclassified';
    const key = raw.toLowerCase();
    if (!map[key]) map[key] = { key: raw, label: raw, trades: 0, wins: 0, losses: 0, totalProfit: 0, totalRisk: 0, totalReward: 0, rSum: 0, rCount: 0, best: null, worst: null };
    const g = map[key];
    const reward = Number(t.reward || 0);
    const risk = Number(t.risk || 0);
    g.trades += 1;
    if (reward > 0) g.wins += 1; else if (reward < 0) g.losses += 1;
    g.totalProfit += reward;
    g.totalRisk += risk;
    g.totalReward += reward;
    if (t.rMultiple !== null && t.rMultiple !== undefined && !isNaN(t.rMultiple)) { g.rSum += Number(t.rMultiple); g.rCount += 1; }
    g.best = g.best === null ? reward : Math.max(g.best, reward);
    g.worst = g.worst === null ? reward : Math.min(g.worst, reward);
  });
  return Object.values(map).map((g) => ({
    ...g,
    winRate: g.trades ? (g.wins / g.trades) * 100 : 0,
    avgProfit: g.trades ? g.totalProfit / g.trades : 0,
    avgRisk: g.trades ? g.totalRisk / g.trades : 0,
    avgReward: g.trades ? g.totalReward / g.trades : 0,
    avgRR: g.rCount ? g.rSum / g.rCount : null,
  })).sort((a, b) => b.totalProfit - a.totalProfit);
}

export const sessionBreakdown = (trades) => groupStatsBy(trades, (t) => t.session).map((g) => ({
  session: g.label, trades: g.trades, pnl: g.totalProfit, winRate: g.winRate,
}));

// Strategy analytics: a trade with N strategy tags counts once per tag.
export function strategyStats(trades) {
  const exploded = [];
  closedTrades(trades).forEach((t) => tradeStrategies(t).forEach((s) => exploded.push({ ...t, _strat: cleanLabel(s) || 'Unclassified' })));
  return groupStatsBy(exploded, (t) => t._strat);
}

export const strategyLeaderboard = (trades) => strategyStats(trades).map((g) => ({
  strategy: g.label, ...g, pnl: g.totalProfit, avgR: g.avgRR === null ? 0 : g.avgRR,
}));

// Strategy + Session combos (exploded by strategy tag)
export function comboLeaderboard(trades) {
  const exploded = [];
  closedTrades(trades).forEach((t) => tradeStrategies(t).forEach((s) => exploded.push({ ...t, _k: `${cleanLabel(s) || 'Unclassified'}  ·  ${cleanLabel(t.session) || 'Unclassified'}` })));
  return groupStatsBy(exploded, (t) => t._k);
}

// New model: Risk & Reward are the source of truth.
// Profit (pnl) = Reward.  RR (rMultiple) = Reward / Risk (null when Risk is 0/invalid).
export function computeTradeMetrics(t) {
  const risk = Number(t.risk);
  const reward = Number(t.reward);
  const validRisk = !isNaN(risk) && risk !== 0;
  const validReward = !isNaN(reward);
  const pnl = validReward ? reward : 0;
  const rMultiple = (validRisk && validReward) ? reward / risk : null;
  return {
    pnl: Number(pnl.toFixed(2)),
    rMultiple: rMultiple === null ? null : Number(rMultiple.toFixed(2)),
  };
}
