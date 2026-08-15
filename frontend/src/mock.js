// Mock data + seed for Trade Sentinel (frontend-only phase)

export const SESSIONS = ['NY AM', 'NY PM', 'NY Lunch', 'Asia', 'London', 'Pre Market'];
export const COMMON_TAGS = ['A+ Setup', 'FOMO', 'Overtraded', 'Patience', 'News', 'Revenge', 'Plan Followed'];
export const SYMBOLS = ['EURUSD', 'GBPUSD', 'XAUUSD', 'BTCUSD', 'NAS100', 'US30', 'ETHUSD', 'GBPJPY'];

export const DEFAULT_GOALS = [
  { id: 'g1', label: 'Monthly Net P&L', target: 5000, current: 0, unit: '$' },
  { id: 'g2', label: 'Win Rate', target: 60, current: 0, unit: '%' },
  { id: 'g3', label: 'Trades Logged', target: 40, current: 0, unit: '' },
  { id: 'g4', label: 'Avg R:R', target: 2, current: 0, unit: 'R' },
];

// Demo trades used only when a fresh account clicks "Load Demo Data"
export function demoTrades() {
  const now = new Date();
  const day = (n) => new Date(now.getTime() - n * 86400000);
  const mk = (i, sym, dir, risk, reward, strat, session, tags, dOff, holdMin) => {
    const date = day(dOff);
    const entryTime = new Date(date); entryTime.setHours(9, 30, 0, 0);
    const exitTime = new Date(entryTime.getTime() + holdMin * 60000);
    return {
      id: `demo-${i}`, symbol: sym, direction: dir, risk, reward,
      strategies: Array.isArray(strat) ? strat : [strat], session, tags, notes: '', screenshot: null,
      status: 'closed', day: date.toISOString().slice(0, 10), date: date.toISOString(),
      entryTime: entryTime.toISOString(), exitTime: exitTime.toISOString(),
    };
  };
  return [
    mk(1, 'XAUUSD', 'long', 200, 500, 'Order Block', 'London', ['A+ Setup', 'Plan Followed'], 12, 95),
    mk(2, 'NAS100', 'short', 300, 750, 'Reversal', 'NY PM', ['Patience'], 10, 130),
    mk(3, 'EURUSD', 'long', 150, -150, 'FVG', 'London', ['FOMO'], 9, 40),
    mk(4, 'BTCUSD', 'long', 400, 1200, ['Breakout', 'Liquidity Sweep'], 'NY AM', ['A+ Setup'], 7, 240),
    mk(5, 'GBPJPY', 'short', 250, 500, 'Liquidity Sweep', 'Asia', ['Plan Followed'], 6, 180),
    mk(6, 'US30', 'long', 200, -200, 'Trend Continuation', 'NY Lunch', ['Overtraded', 'Revenge'], 5, 65),
    mk(7, 'XAUUSD', 'short', 300, 900, 'Reversal', 'London', ['A+ Setup', 'Patience'], 3, 150),
    mk(8, 'ETHUSD', 'long', 350, 700, 'Breakout', 'NY AM', ['Plan Followed'], 2, 300),
    mk(9, 'EURUSD', 'short', 150, -75, 'FVG', 'Pre Market', ['FOMO', 'News'], 1, 55),
    mk(10, 'NAS100', 'long', 300, 600, 'Order Block', 'NY AM', ['A+ Setup'], 0, 110),
  ];
}

export const MOTIVATION = [
  'Discipline is the bridge between plan and P&L.',
  'Cut losers fast. Log everything. Trust the process.',
  'You don’t rise to your goals, you fall to your systems.',
  'The market rewards patience, not prediction.',
  'Risk management is the only edge you fully control.',
];
